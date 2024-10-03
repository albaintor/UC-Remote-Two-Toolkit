import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewEncapsulation} from '@angular/core';
import {ServerService} from "../../server.service";
import {MediaEntityState, RemoteWebsocketService} from "../../remote-widget/remote-websocket.service";
import {NgIf} from "@angular/common";
import {ScrollingTextComponent} from "../../controls/scrolling-text/scrolling-text.component";
import {SliderComponent} from "../../controls/slider/slider.component";
import {Helper} from "../../helper";
import {Remote} from "../../interfaces";

@Component({
  selector: 'app-actiivty-media-entity',
  standalone: true,
  imports: [
    NgIf,
    ScrollingTextComponent,
    SliderComponent
  ],
  templateUrl: './actiivty-media-entity.component.html',
  styleUrl: './actiivty-media-entity.component.css',
  changeDetection: ChangeDetectionStrategy.Default,
  encapsulation: ViewEncapsulation.None,
})
export class ActiivtyMediaEntityComponent {
  @Input() mediaEntity: MediaEntityState | undefined;
  @Input() remote: Remote | undefined;

  constructor(protected remoteWebsocketService: RemoteWebsocketService, private server:ServerService) {
  }
  protected readonly Math = Math;


  protected readonly Helper = Helper;

  checkFeature(mediaEntity: MediaEntityState, feature: string | string[]): boolean
  {
    if (!mediaEntity.new_state?.features) return false;
    const features = (Array.isArray(feature)) ? feature as string[] : [feature];
    return mediaEntity.new_state.features.find(item => features.includes(item)) !== undefined;
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
}
