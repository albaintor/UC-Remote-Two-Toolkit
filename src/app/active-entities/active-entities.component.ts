import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewEncapsulation} from '@angular/core';
import {DropdownModule} from "primeng/dropdown";
import {AsyncPipe, NgForOf, NgIf} from "@angular/common";
import {MenuItem, PrimeTemplate} from "primeng/api";
import {ProgressBarModule} from "primeng/progressbar";
import {ScrollingTextComponent} from "../remote-widget/scrolling-text/scrolling-text.component";
import {TagModule} from "primeng/tag";
import {MediaEntityState, RemoteState, RemoteWebsocketService} from "../remote-widget/remote-websocket.service";
import {ServerService} from "../server.service";
import {MenubarModule} from "primeng/menubar";
import {Remote, RemoteData} from "../interfaces";
import {FormsModule} from "@angular/forms";
import {Helper} from "../helper";
import {SliderComponent} from "../slider/slider.component";

@Component({
  selector: 'app-active-entities',
  standalone: true,
  imports: [
    DropdownModule,
    NgIf,
    PrimeTemplate,
    ProgressBarModule,
    ScrollingTextComponent,
    TagModule,
    NgForOf,
    AsyncPipe,
    MenubarModule,
    FormsModule,
    SliderComponent
  ],
  templateUrl: './active-entities.component.html',
  styleUrl: './active-entities.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ActiveEntitiesComponent implements OnInit {
  remoteState: RemoteState | undefined;
  mediaEntities: MediaEntityState[] = [];
  protected readonly Math = Math;
  menuItems: MenuItem[] = [
    {label: 'Home', routerLink: '/home', icon: 'pi pi-home'},
  ]
  selectedRemote: Remote | undefined;
  remotes: Remote[] | undefined;

  constructor(private server:ServerService, protected remoteWebsocketService: RemoteWebsocketService, private cdr:ChangeDetectorRef) { }

  ngOnInit(): void {
    const data = localStorage.getItem("remoteData");
    if (data) {
      const remoteData: RemoteData = JSON.parse(data);
      this.server.setEntities(remoteData.entities);
    }
    this.server.remote$.subscribe(remote => {
      this.selectedRemote = remote;
      this.server.getRemoteBattery(this.selectedRemote).subscribe(batteryInfo => {
        this.remoteState = {batteryInfo};
        this.cdr.detectChanges();
      })
      this.cdr.detectChanges();
    })
    this.remoteWebsocketService.onRemoteStateChange().subscribe(remoteState => {
      this.remoteState = remoteState;
      this.cdr.detectChanges();
    })
    this.remoteWebsocketService.onMediaStateChange().subscribe(remoteState => {
      this.mediaEntities = this.remoteWebsocketService.mediaEntities;
      this.cdr.detectChanges();
    })
    this.server.getConfig().subscribe(config => {
      this.remotes = config.remotes!;
      this.selectedRemote  = Helper.getSelectedRemote(this.remotes);
      if (this.selectedRemote) this.server.remote$.next(this.selectedRemote);
      this.cdr.detectChanges();
    })
  }

  getStatusStyle(state: string) {
    switch(state)
    {
      case "UNAVAILABLE":
      case "UNKNOWN": return "danger";
      case "ON": return "info";
      case "OFF": return "secondary";
      case "PLAYING": return "success";
      case "PAUSED": return "warning";
      case "STANDBY": return "secondary";
      case "BUFFERING":return "success";
      default: return "secondary";
    }
  }

  formatDuration(duration: number): string {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration - (hours * 3600)) / 60);
    const seconds = duration - (hours * 3600) - (minutes * 60);
    return hours.toString().padStart(2, '0') + ':' +
      minutes.toString().padStart(2, '0') + ':' +
      seconds.toString().padStart(2, '0');
  }

  setRemote(remote: Remote) {
    this.server.remote$.next(remote);
    this.cdr.detectChanges();
  }

  checkFeature(mediaEntity: MediaEntityState, feature: string): boolean
  {
    if (!mediaEntity.new_state?.features) return false;
    return mediaEntity.new_state.features.includes(feature);
  }

  updateVolume(volume: number, mediaEntity: MediaEntityState) {
    console.debug("Volume update", volume, mediaEntity);
    if (!mediaEntity || !this.selectedRemote
      || !this.checkFeature(mediaEntity, "volume")) return;
    this.server.executeRemotetCommand(this.selectedRemote, {entity_id: mediaEntity.entity_id,
      cmd_id:"media_player.volume", params: {"volume": volume}}).subscribe(
      {error: err => console.error("Error updating volume", err)});
  }

  updatePosition(position: number, mediaEntity: MediaEntityState) {
    console.debug("Position update", position, mediaEntity);
    if (!mediaEntity || !this.selectedRemote || !mediaEntity.new_state?.attributes?.media_duration
      || !this.checkFeature(mediaEntity, "seek")) return;

    const newPosition = Math.floor(mediaEntity.new_state.attributes.media_duration*position/100);
    const body = {entity_id: mediaEntity.entity_id,
      cmd_id:"media_player.seek", params: {"media_position": newPosition}};
    console.debug("Seek", body);
    this.server.executeRemotetCommand(this.selectedRemote, body).subscribe(
        {error: err => console.error("Error updting position", err)});
  }

  clickState(mediaEntity: MediaEntityState) {
    if (!this.selectedRemote) return;
    const hasPlayPause = this.checkFeature(mediaEntity, "play_pause");
    const hasPause = this.checkFeature(mediaEntity, "pause");
    const hasPlay = this.checkFeature(mediaEntity, "play");
    if (mediaEntity.new_state?.attributes?.state === "PLAYING")
    {
      if (hasPause)
      {
        this.server.executeRemotetCommand(this.selectedRemote, {entity_id: mediaEntity.entity_id,
          cmd_id:"media_player.pause"}).subscribe();
      } else if (hasPlayPause)
      {
        this.server.executeRemotetCommand(this.selectedRemote, {entity_id: mediaEntity.entity_id,
          cmd_id:"media_player.play_pause"}).subscribe();
      }
    } else
    {
      if (hasPlay)
      {
        this.server.executeRemotetCommand(this.selectedRemote, {entity_id: mediaEntity.entity_id,
          cmd_id:"media_player.play"}).subscribe();
      } else if (hasPlayPause)
      {
        this.server.executeRemotetCommand(this.selectedRemote, {entity_id: mediaEntity.entity_id,
          cmd_id:"media_player.play_pause"}).subscribe();
      }
    }
  }
}
