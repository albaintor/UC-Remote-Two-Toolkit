import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  TemplateRef,
  ViewEncapsulation
} from '@angular/core';
import {MediaEntityState, RemoteWebsocketService} from "../../remote-widget/remote-websocket.service";
import {Remote} from "../../interfaces";
import {ServerService} from "../../server.service";
import {Button} from "primeng/button";
import {DropdownOverComponent} from "../../controls/dropdown-over/dropdown-over.component";
import {NgIf, NgTemplateOutlet} from "@angular/common";
import {ScrollingTextComponent} from "../../remote-widget/scrolling-text/scrolling-text.component";
import {SliderComponent} from "../../controls/slider/slider.component";
import {TagModule} from "primeng/tag";
import {TooltipModule} from "primeng/tooltip";

@Component({
  selector: 'app-media-entity',
  standalone: true,
  imports: [
    Button,
    DropdownOverComponent,
    NgIf,
    ScrollingTextComponent,
    SliderComponent,
    TagModule,
    TooltipModule,
    NgTemplateOutlet
  ],
  templateUrl: './media-entity.component.html',
  styleUrl: './media-entity.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class MediaEntityComponent implements OnInit {
  protected readonly Math = Math;
  @Input() mediaEntity: MediaEntityState | undefined;
  @Input() remote: Remote | undefined;
  @Input() headerTemplate : TemplateRef<HTMLAreaElement> | undefined;

  constructor(private server:ServerService, protected remoteWebsocketService: RemoteWebsocketService, private cdr:ChangeDetectorRef) { }

  ngOnInit(): void {
    this.remoteWebsocketService.onMediaStateChange().subscribe(remoteState => {
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

  checkFeature(mediaEntity: MediaEntityState, feature: string): boolean
  {
    if (!mediaEntity.new_state?.features) return false;
    return mediaEntity.new_state.features.includes(feature);
  }

  updateVolume(volume: number, mediaEntity: MediaEntityState) {
    console.debug("Volume update", volume, mediaEntity);
    if (!mediaEntity || !this.remote
      || !this.checkFeature(mediaEntity, "volume")) return;
    this.server.executeRemotetCommand(this.remote, {entity_id: mediaEntity.entity_id,
      cmd_id:"media_player.volume", params: {"volume": volume}}).subscribe(
      {error: err => console.error("Error updating volume", err)});
  }

  updatePosition(position: number, mediaEntity: MediaEntityState) {
    console.debug("Position update", position, mediaEntity);
    if (!mediaEntity || !this.remote || !mediaEntity.new_state?.attributes?.media_duration
      || !this.checkFeature(mediaEntity, "seek")) return;

    const newPosition = Math.floor(mediaEntity.new_state.attributes.media_duration*position/100);
    const body = {entity_id: mediaEntity.entity_id,
      cmd_id:"media_player.seek", params: {"media_position": newPosition}};
    console.debug("Seek", body);
    this.server.executeRemotetCommand(this.remote, body).subscribe(
      {error: err => console.error("Error updting position", err)});
  }

  clickState(mediaEntity: MediaEntityState) {
    if (!this.remote) return;
    const hasPlayPause = this.checkFeature(mediaEntity, "play_pause");
    const hasPause = this.checkFeature(mediaEntity, "pause");
    const hasPlay = this.checkFeature(mediaEntity, "play");
    if (mediaEntity.new_state?.attributes?.state === "PLAYING")
    {
      if (hasPause)
      {
        this.server.executeRemotetCommand(this.remote, {entity_id: mediaEntity.entity_id,
          cmd_id:"media_player.pause"}).subscribe();
      } else if (hasPlayPause)
      {
        this.server.executeRemotetCommand(this.remote, {entity_id: mediaEntity.entity_id,
          cmd_id:"media_player.play_pause"}).subscribe();
      }
    } else
    {
      if (hasPlay)
      {
        this.server.executeRemotetCommand(this.remote, {entity_id: mediaEntity.entity_id,
          cmd_id:"media_player.play"}).subscribe();
      } else if (hasPlayPause)
      {
        this.server.executeRemotetCommand(this.remote, {entity_id: mediaEntity.entity_id,
          cmd_id:"media_player.play_pause"}).subscribe();
      }
    }
  }

  powerToggle(mediaEntity: MediaEntityState) {
    if (!this.remote) return;
    if (this.checkFeature(mediaEntity, 'toggle')) {
      this.server.executeRemotetCommand(this.remote, {
        entity_id: mediaEntity.entity_id,
        cmd_id: "media_player.toggle"
      }).subscribe();
      return;
    }
    else if (!mediaEntity.new_state?.attributes?.state || ["OFF", "UNAVAILABLE", "UNKNOWN", "STANDBY"].includes(mediaEntity.new_state.attributes.state))
      this.server.executeRemotetCommand(this.remote, {
        entity_id: mediaEntity.entity_id,
        cmd_id: "media_player.on"
      }).subscribe();
    else
      this.server.executeRemotetCommand(this.remote, {
        entity_id: mediaEntity.entity_id,
        cmd_id: "media_player.off"
      }).subscribe();
  }

  sourceSelected(mediaEntity: MediaEntityState, source: any) {
    if (!this.remote || !source || source == mediaEntity.new_state?.attributes?.source) return;
    console.debug("Source selected", mediaEntity.new_state?.attributes?.source);
    this.server.executeRemotetCommand(this.remote, {
      entity_id: mediaEntity.entity_id,
      cmd_id: "media_player.select_source", params: {
        "source": source
      }
    }).subscribe();
  }
}
