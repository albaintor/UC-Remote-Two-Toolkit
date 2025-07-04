import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, EventEmitter,
  Input,
  OnInit, Output,
  TemplateRef,
  ViewEncapsulation
} from '@angular/core';
import {Remote} from "../../interfaces";
import {ServerService} from "../../server.service";
import {DropdownOverComponent} from "../../controls/dropdown-over/dropdown-over.component";
import {NgIf, NgTemplateOutlet} from "@angular/common";
import {ScrollingTextComponent} from "../../controls/scrolling-text/scrolling-text.component";
import {SliderComponent} from "../../controls/slider/slider.component";
import {TagModule} from "primeng/tag";
import {TooltipModule} from "primeng/tooltip";
import {Helper} from "../../helper";
import {MediaEntityState} from "../../websocket/remote-websocket-instance";
import {WebsocketService} from "../../websocket/websocket.service";
import {CdkDragHandle} from "@angular/cdk/drag-drop";
import {ButtonComponent} from "../../controls/button/button.component";
import {ToastMessageOptions} from "primeng/api";
import {HttpErrorResponse} from "@angular/common/http";

@Component({
    selector: 'app-media-entity',
    imports: [
        DropdownOverComponent,
        NgIf,
        ScrollingTextComponent,
        SliderComponent,
        TagModule,
        TooltipModule,
        NgTemplateOutlet,
        CdkDragHandle,
        ButtonComponent,
    ],
    templateUrl: './media-entity.component.html',
    styleUrl: './media-entity.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class MediaEntityComponent implements OnInit, AfterViewInit {
  protected readonly Math = Math;
  @Input() mediaEntity: MediaEntityState | undefined;
  @Input() remote: Remote | undefined;
  @Input() headerTemplate : TemplateRef<HTMLAreaElement> | undefined;
  @Input() scale = 1;
  @Input() closable: boolean = false;
  @Output() onClose: EventEmitter<MediaEntityState> = new EventEmitter();
  @Output() onMessage: EventEmitter<ToastMessageOptions> = new EventEmitter();
  protected readonly Helper = Helper;

  textStyle = "font-size: 1.2rem";

  constructor(private server:ServerService, protected websocketService: WebsocketService, private cdr:ChangeDetectorRef) { }

  ngOnInit(): void {
    this.websocketService.onMediaStateChange().subscribe(remoteState => {
      this.cdr.detectChanges();
    })
    this.websocketService.onMediaPositionChange().subscribe(entities => {
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit() {
    const fontSize = Math.round(this.scale*1.1*10)/10;
    this.textStyle = "font-size: "+fontSize+"rem";
    this.cdr.detectChanges();
  }

  hasArtwork()
  {
   return !!this.mediaEntity?.new_state?.attributes?.media_image_url;
  }

  getStatusStyle(state: string) {
    switch(state)
    {
      case "UNAVAILABLE":
      case "UNKNOWN": return "danger";
      case "ON": return "info";
      case "OFF": return "secondary";
      case "PLAYING": return "success";
      case "PAUSED": return "warn";
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

  checkFeature(mediaEntity: MediaEntityState, feature: string | string[]): boolean
  {
    if (!mediaEntity.new_state?.features) return false;
    const features = (Array.isArray(feature)) ? feature as string[] : [feature];
    return mediaEntity.new_state.features.find(item => features.includes(item)) !== undefined;
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
      {error: (err: HttpErrorResponse) =>
          this.onMessage.emit({
            severity: "error",
            detail: `Error setting ${this.mediaEntity?.entity_id} position to ${newPosition} : ${err.error.code} - ${err.error.message}`
          })
      });
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

  isPowerOn(mediaEntity: MediaEntityState): boolean {
    return !(!mediaEntity?.new_state?.attributes?.state ||
      ["OFF", "UNAVAILABLE", "UNKNOWN", "STANDBY"].includes(mediaEntity.new_state?.attributes.state));
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
    else if (!this.isPowerOn(mediaEntity))
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
    }).subscribe({error: (err: HttpErrorResponse) =>
        this.onMessage.emit({
          severity: "error",
          detail: `Error setting ${this.mediaEntity?.entity_id} source to ${source} : ${err.error.code} - ${err.error.message}`
        })
    });
  }

  soundModeSelected(mediaEntity: MediaEntityState, sound_mode: any) {
    if (!this.remote || !sound_mode || sound_mode == mediaEntity.new_state?.attributes?.sound_mode) return;
    console.debug("Sound mode selected", mediaEntity.new_state?.attributes?.sound_mode);
    this.server.executeRemotetCommand(this.remote, {
      entity_id: mediaEntity.entity_id,
      cmd_id: "media_player.select_sound_mode", params: {
        "mode": sound_mode
      }
    }).subscribe({error: (err: HttpErrorResponse) =>
        this.onMessage.emit({
          severity: "error",
          detail: `Error setting ${this.mediaEntity?.entity_id} sound mode to ${sound_mode} : ${err.error.code} - ${err.error.message}`
        })
    });
  }

  hasMediaControls(mediaEntity: MediaEntityState) {
    return this.checkFeature(mediaEntity, ["stop", "play_pause", "rewind", "fast_forward"])
  }

  mediaAction(mediaEntity: MediaEntityState, cmd_id: string)
  {
    if (!this.remote) return;
    this.server.executeRemotetCommand(this.remote, {entity_id: mediaEntity.entity_id,
      cmd_id}).subscribe();
  }

  closeEntity(mediaEntity: MediaEntityState) {
    if (!this.mediaEntity) return;
    this.onClose.emit(this.mediaEntity);
    this.cdr.detectChanges();
  }
}
