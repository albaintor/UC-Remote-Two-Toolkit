import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input, OnInit,
  TemplateRef,
  ViewEncapsulation
} from '@angular/core';
import {LightEntityState, MediaEntityState} from "../../websocket/remote-websocket-instance";
import {Remote} from "../../interfaces";
import {Helper} from "../../helper";
import {ServerService} from "../../server.service";
import {WebsocketService} from "../../websocket/websocket.service";
import {NgIf, NgTemplateOutlet} from "@angular/common";
import {Button} from "primeng/button";
import {TooltipModule} from "primeng/tooltip";
import {CdkDragHandle} from "@angular/cdk/drag-drop";
import {SliderComponent} from "../../controls/slider/slider.component";

@Component({
  selector: 'app-light-entity',
  standalone: true,
  imports: [
    NgIf,
    Button,
    TooltipModule,
    CdkDragHandle,
    NgTemplateOutlet,
    SliderComponent
  ],
  templateUrl: './light-entity.component.html',
  styleUrl: './light-entity.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class LightEntityComponent implements OnInit {
  @Input() lightEntity: LightEntityState | undefined;
  @Input() remote: Remote | undefined;
  @Input() headerTemplate : TemplateRef<HTMLAreaElement> | undefined;
  @Input() scale = 1;
  @Input() closable: boolean = false;
  protected readonly Helper = Helper;

  constructor(private server:ServerService, protected websocketService: WebsocketService, private cdr:ChangeDetectorRef) { }

  ngOnInit(): void {
    this.websocketService.onLightChange().subscribe(remoteState => {
      console.debug("Changed light", this.lightEntity);
      this.cdr.detectChanges();
    })
  }

  checkFeature(lightEntityState: LightEntityState, feature: string | string[]): boolean
  {
    if (!lightEntityState.new_state?.features) return false;
    const features = (Array.isArray(feature)) ? feature as string[] : [feature];
    return lightEntityState.new_state.features.find(item => features.includes(item)) !== undefined;
  }

  powerToggle(lightEntity: LightEntityState) {
    if (!this.remote) return;
    if (this.checkFeature(lightEntity, 'toggle')) {
      this.server.executeRemotetCommand(this.remote, {
        entity_id: lightEntity.entity_id,
        cmd_id: "light.toggle"
      }).subscribe();
      return;
    }
    else if (lightEntity?.new_state?.attributes?.state !== 'ON')
      this.server.executeRemotetCommand(this.remote, {
        entity_id: lightEntity.entity_id,
        cmd_id: "light.on"
      }).subscribe();
    else
      this.server.executeRemotetCommand(this.remote, {
        entity_id: lightEntity.entity_id,
        cmd_id: "light.off"
      }).subscribe();
  }

  isOn(): boolean {
    return this.lightEntity?.new_state?.attributes?.state === 'ON';
  }

  closeEntity() {
    if (!this.lightEntity) return;
    const index = this.websocketService.lightEntities.indexOf(this.lightEntity);
    if (index && index > -1) this.websocketService.lightEntities.splice(index, 1);
    this.cdr.detectChanges();
  }

  protected readonly Math = Math;

  updateBrightness(value: number, lightEntity: LightEntityState) {
    if (this.remote) {
      if (value == 0)
        this.server.executeRemotetCommand(this.remote, {
          entity_id: lightEntity.entity_id,
          cmd_id: "light.off"
        }).subscribe();
      else this.server.executeRemotetCommand(this.remote, {
        entity_id: lightEntity.entity_id,
        cmd_id: "light.on",
        params: {brightness: Math.round(value * 255 / 100)}
      }).subscribe();
      console.debug("Set brightness", lightEntity, value);
    }
  }
}
