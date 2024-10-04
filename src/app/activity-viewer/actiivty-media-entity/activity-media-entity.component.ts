import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  ViewEncapsulation
} from '@angular/core';
import {ServerService} from "../../server.service";
import {MediaEntityState, RemoteWebsocketService} from "../../remote-widget/remote-websocket.service";
import {NgIf} from "@angular/common";
import {ScrollingTextComponent} from "../../controls/scrolling-text/scrolling-text.component";
import {SliderComponent} from "../../controls/slider/slider.component";
import {Helper} from "../../helper";
import {Remote} from "../../interfaces";

@Component({
  selector: 'app-activity-media-entity',
  standalone: true,
  imports: [
    NgIf,
    ScrollingTextComponent,
    SliderComponent
  ],
  templateUrl: './activity-media-entity.component.html',
  styleUrl: './activity-media-entity.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ActivityMediaEntityComponent implements AfterViewInit {
  mediaEntityState: MediaEntityState | undefined;
  imageUrl: string | undefined;
  entityId: string | undefined;
  @Input("entityId") set _entityId(entityId: string | undefined)
  {
    this.entityId = entityId;
    this.updateEntity(this.remoteWebsocketService.mediaEntities);
  }
  @Input() remote: Remote | undefined;
  protected readonly Math = Math;
  protected readonly Helper = Helper;
  textStyle = "font-size: 1.2rem";
  @Input() size: { width: number; height: number } | undefined;

  constructor(protected remoteWebsocketService: RemoteWebsocketService, private server:ServerService,
              private cdr: ChangeDetectorRef) {
  }

  ngAfterViewInit(): void {
    this.remoteWebsocketService.onMediaStateChange().subscribe(mediaStates => {
      this.updateEntity(mediaStates);
    })
    this.remoteWebsocketService.onMediaPositionChange().subscribe(entities => {
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
    console.debug("Media Entity update", mediaEntityState);
    if (!mediaEntityState) return;
    if (this.mediaEntityState != mediaEntityState)
    {
      this.mediaEntityState = mediaEntityState;
      this.cdr.detectChanges();
      return;
    }
    if (this.mediaEntityState?.new_state?.attributes?.media_image_url && this.mediaEntityState?.new_state?.attributes?.media_image_proxy)
    {
      this.imageUrl = `'/api/proxy?url='${this.mediaEntityState.new_state.attributes.media_image_url}`;
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
    this.server.executeRemotetCommand(this.remote, body).subscribe(
      {error: err => console.error("Error updting position", err)});
  }
}
