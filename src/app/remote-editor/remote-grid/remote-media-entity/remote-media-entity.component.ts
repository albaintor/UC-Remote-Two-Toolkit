import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, EventEmitter,
  Input, Output,
  ViewEncapsulation
} from '@angular/core';
import {ServerService} from "../../../server.service";
import {NgIf} from "@angular/common";
import {ScrollingTextComponent} from "../../../controls/scrolling-text/scrolling-text.component";
import {SliderComponent} from "../../../controls/slider/slider.component";
import {Helper} from "../../../helper";
import {Command, Remote} from "../../../interfaces";
import {ButtonMode} from "../../remote-buttons/remote-buttons.component";
import {HttpErrorResponse} from "@angular/common/http";
import {MediaEntityState} from "../../../websocket/remote-websocket-instance";
import {WebsocketService} from "../../../websocket/websocket.service";

@Component({
    selector: 'app-activity-media-entity',
    imports: [
        NgIf,
        ScrollingTextComponent,
        SliderComponent
    ],
    templateUrl: './remote-media-entity.component.html',
    styleUrl: './remote-media-entity.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class RemoteMediaEntityComponent implements AfterViewInit {
  mediaEntityState: MediaEntityState | undefined;
  imageUrl: string | undefined;
  entityId: string | undefined;
  @Input("entityId") set _entityId(entityId: string | undefined)
  {
    this.entityId = entityId;
    this.updateEntity(this.websocketService.mediaEntities);
  }
  @Input() remote: Remote | undefined;
  protected readonly Math = Math;
  protected readonly Helper = Helper;
  textStyle = "font-size: 1.2rem";
  @Input() size: { width: number; height: number } | undefined;
  @Output() onSelectButton: EventEmitter<{command: Command, mode: ButtonMode, severity: "success" | "error",
    error?: string}> = new EventEmitter();

  constructor(protected websocketService: WebsocketService, private server:ServerService,
              private cdr: ChangeDetectorRef) {
  }

  ngAfterViewInit(): void {
    this.websocketService.onMediaStateChange().subscribe(mediaStates => {
      this.updateEntity(mediaStates);
    })
    this.websocketService.onMediaPositionChange().subscribe(entities => {
      this.updatePosition(entities);
    })
    if (this.size?.height)
    {
      const fontSize = Math.round(this.size.height*1.2/400*10)/10;
      this.textStyle = "font-size: "+fontSize+"rem";
      this.cdr.detectChanges();
    }
  }

  updateEntity(mediaStates: MediaEntityState[])
  {
    if (!this.entityId) {
      this.mediaEntityState = undefined;
      this.imageUrl = undefined;
      this.cdr.detectChanges();
      return;
    }
    const mediaEntityState = mediaStates.find(item => item.entity_id === this.entityId);
    if (!mediaEntityState) return;
    console.debug("Media Entity update", mediaEntityState);
    if (this.mediaEntityState != mediaEntityState)
    {
      this.mediaEntityState = mediaEntityState;
      this.cdr.detectChanges();
    }
    if (this.mediaEntityState?.new_state?.attributes?.media_image_url && this.mediaEntityState?.new_state?.attributes?.media_image_proxy)
    {
      this.imageUrl = `/api/proxy?url=${this.mediaEntityState.new_state.attributes.media_image_url}`;
    } else if (this.mediaEntityState?.new_state?.attributes?.media_image_url)
      this.imageUrl = this.mediaEntityState?.new_state?.attributes?.media_image_url;
    this.cdr.detectChanges();
  }

  updatePosition(mediaStates: MediaEntityState[])
  {
    if (!this.entityId) {
      return;
    }
    const mediaEntityState = mediaStates.find(item => item.entity_id === this.entityId);
    if (!mediaEntityState) return;
    if (this.mediaEntityState != mediaEntityState)
      this.mediaEntityState = mediaEntityState;
    this.cdr.detectChanges();
  }


  checkFeature(mediaEntity: MediaEntityState, feature: string | string[]): boolean
  {
    if (!mediaEntity.new_state?.features) return false;
    const features = (Array.isArray(feature)) ? feature as string[] : [feature];
    return mediaEntity.new_state.features.find(item => features.includes(item)) !== undefined;
  }

  setPosition(position: number, mediaEntity: MediaEntityState) {
    console.debug("Position update", position, mediaEntity);
    if (!mediaEntity || !this.remote || !mediaEntity.new_state?.attributes?.media_duration
      || !this.checkFeature(mediaEntity, "seek")) return;

    const newPosition = Math.floor(mediaEntity.new_state.attributes.media_duration*position/100);
    const body = {entity_id: mediaEntity.entity_id,
      cmd_id:"media_player.seek", params: {"media_position": newPosition}};
    console.debug("Seek", body);

    this.server.executeRemotetCommand(this.remote, body).subscribe({next: results => {
        this.onSelectButton.emit({command: body, mode: ButtonMode.ShortPress, severity: "success"});
      }, error: (err: HttpErrorResponse) => {
        console.error("Error command", err);
        this.onSelectButton.emit({command: body, mode: ButtonMode.ShortPress, severity: "error"});
        this.onSelectButton.emit({command:body, mode: ButtonMode.ShortPress, severity: "error",
          error: `Error updating position : ${err.error.name} (${err.status} ${err.statusText})`});
      }});
  }
}
