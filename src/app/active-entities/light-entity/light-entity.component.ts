import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, EventEmitter,
  Input, OnInit,
  Output,
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
import {ColorPickerModule} from "primeng/colorpicker";
import {FormsModule} from "@angular/forms";
import {ButtonComponent} from "../../controls/button/button.component";
import {Message} from "primeng/api";
import {HttpErrorResponse} from "@angular/common/http";
import {ScrollingTextComponent} from "../../controls/scrolling-text/scrolling-text.component";

@Component({
  selector: 'app-light-entity',
  standalone: true,
    imports: [
        NgIf,
        Button,
        TooltipModule,
        CdkDragHandle,
        NgTemplateOutlet,
        SliderComponent,
        ColorPickerModule,
        FormsModule,
        ButtonComponent,
        ScrollingTextComponent
    ],
  templateUrl: './light-entity.component.html',
  styleUrl: './light-entity.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class LightEntityComponent implements OnInit {
  lightEntity: LightEntityState | undefined;
  @Input("lightEntity") set _lightEntity( lightEntity: LightEntityState | undefined)
  {
    this.lightEntity = lightEntity;
    if (this.lightEntity) this.updateLightAttributes();
  }
  @Input() remote: Remote | undefined;
  @Input() headerTemplate : TemplateRef<HTMLAreaElement> | undefined;
  @Input() scale = 1;
  @Input() closable: boolean = false;
  @Output() onClose: EventEmitter<LightEntityState> = new EventEmitter();
  @Output() onMessage: EventEmitter<Message> = new EventEmitter();
  protected readonly Helper = Helper;
  protected readonly Math = Math;
  lightColor: {h: number; s: number; b: number} | undefined;

  constructor(private server:ServerService, protected websocketService: WebsocketService, private cdr:ChangeDetectorRef) { }

  ngOnInit(): void {
    this.websocketService.onLightChange().subscribe(remoteState => {
      if (remoteState.find(item => item.entity_id === this.lightEntity?.entity_id))
      {
        this.updateLightAttributes();
        // console.debug("Changed light", this.lightEntity, this.lightColor);
        this.cdr.detectChanges();
      }
    })
  }

  updateLightAttributes()
  {
    if (!this.lightEntity) return;
    if (!this.lightEntity.new_state) this.lightEntity.new_state = {};
    if (!this.lightEntity.new_state.attributes) this.lightEntity.new_state.attributes = {};

    if (this.checkFeature(this.lightEntity, "brightness") && !this.lightEntity?.new_state?.attributes?.brightness)
      this.lightEntity.new_state.attributes.brightness = 100;
    if (this.checkFeature(this.lightEntity, "color_temperature") && !this.lightEntity?.new_state?.attributes?.color_temperature)
      this.lightEntity.new_state.attributes.color_temperature = 100;

    if (this.checkFeature(this.lightEntity, "color"))
    {
      const h = Math.round(this.lightEntity?.new_state?.attributes?.hue ? this.lightEntity.new_state.attributes.hue : 0);
      const s = Math.round(this.lightEntity?.new_state?.attributes?.saturation ? this.lightEntity.new_state.attributes.saturation/255*100 : 100);
      const b = Math.round(this.lightEntity?.new_state?.attributes?.brightness ? this.lightEntity.new_state.attributes.brightness/255*100 : 100);
      /*if (this.lightColor)
      {
        this.lightColor.h = h;
        this.lightColor.s = s;
        this.lightColor.b = b;
      } else*/ this.lightColor = {h, s, b};
      // console.debug(`Color ${this.lightEntity?.entity_id}`, this.lightColor);
    }
  }

  getColor()
  {
    if (!this.lightEntity) return "white";
    if (this.checkFeature(this.lightEntity, "color")) {
      const h = Math.round(this.lightEntity?.new_state?.attributes?.hue ? this.lightEntity.new_state.attributes.hue : 0);
      const s = Math.round(this.lightEntity?.new_state?.attributes?.saturation ? this.lightEntity.new_state.attributes.saturation / 255 * 100 : 100);
      const b = Math.round(this.lightEntity?.new_state?.attributes?.brightness ? this.lightEntity.new_state.attributes.brightness / 255 * 100 : 100);
      // console.debug(this.lightEntity.entity_id, `hsl(${h},${s}%,${b}%)`)
      return `hsl(${h},100%,50%)`;
    }
    return "white";
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
      }).subscribe({next: res => {
        this.onMessage.emit({severity: "success", summary: `Light ${this.lightEntity?.entity_id} toggle`});
      },
        error: (err: HttpErrorResponse) => {
          this.onMessage.emit({
            severity: "error",
            detail: `Error toggling ${this.lightEntity?.entity_id} : ${err.error.code} - ${err.error.message}`
          })
        }
    });
      return;
    }
    else if (lightEntity?.new_state?.attributes?.state !== 'ON')
      this.server.executeRemotetCommand(this.remote, {
        entity_id: lightEntity.entity_id,
        cmd_id: "light.on"
      }).subscribe({next: res => {
      this.onMessage.emit({severity: "success", summary: `Light ${this.lightEntity?.entity_id} on`});
    },
        error: (err: HttpErrorResponse) => {
          this.onMessage.emit({
            severity: "error",
            detail: `Error turning on ${this.lightEntity?.entity_id} : ${err.error.code} - ${err.error.message}`
          })
        }
  });
    else
      this.server.executeRemotetCommand(this.remote, {
        entity_id: lightEntity.entity_id,
        cmd_id: "light.off"
      }).subscribe({next: res => {
      this.onMessage.emit({severity: "success", summary: `Light ${this.lightEntity?.entity_id} off`});
    },
        error: (err: HttpErrorResponse) => {
          this.onMessage.emit({
            severity: "error",
            detail: `Error turning off ${this.lightEntity?.entity_id} : ${err.error.code} - ${err.error.message}`
          })
        }
  });
  }

  isOn(): boolean {
    return this.lightEntity?.new_state?.attributes?.state === 'ON';
  }

  closeEntity() {
    if (!this.lightEntity) return;
    this.onClose.emit(this.lightEntity);
    this.cdr.detectChanges();
  }

  updateBrightness(value: number, lightEntity: LightEntityState) {
    if (this.remote) {
      if (value == 0)
        this.server.executeRemotetCommand(this.remote, {
          entity_id: lightEntity.entity_id,
          cmd_id: "light.off"
        }).subscribe({next: res => {
        this.onMessage.emit({severity: "success", summary: `Light ${this.lightEntity?.entity_id} off`});
      },
          error: (err: HttpErrorResponse) => {
            this.onMessage.emit({
              severity: "error",
              detail: `Error turning off ${this.lightEntity?.entity_id} : ${err.error.code} - ${err.error.message}`
            })
          }
    });
      else this.server.executeRemotetCommand(this.remote, {
        entity_id: lightEntity.entity_id,
        cmd_id: "light.on",
        params: {brightness: Math.round(value * 255 / 100)}
      }).subscribe({next: res => {
        this.onMessage.emit({
          severity: "success",
          summary: `Light ${this.lightEntity?.entity_id} brightness ${Math.round(value * 255 / 100)}%`
        });
      },
        error: (err: HttpErrorResponse) => {
          this.onMessage.emit({
            severity: "error",
            detail: `Error setting ${this.lightEntity?.entity_id} brightness mode to ${Math.round(value*255/100)}% : ${err.error.code} - ${err.error.message}`
          })
        }
    });
      // console.debug("Set brightness", lightEntity, value);
    }
  }

  updateColorTemperature(value: number, lightEntity: LightEntityState) {
    if (this.remote) {
      if (value == 0)
        this.server.executeRemotetCommand(this.remote, {
          entity_id: lightEntity.entity_id,
          cmd_id: "light.off"
        }).subscribe({next: res => {
        this.onMessage.emit({severity: "success", summary: `Light ${this.lightEntity?.entity_id} off`});
      },
          error: (err: HttpErrorResponse) => {
            this.onMessage.emit({
              severity: "error",
              detail: `Error turning off ${this.lightEntity?.entity_id} : ${err.error.code} - ${err.error.message}`
            })
          }
    });
      else this.server.executeRemotetCommand(this.remote, {
        entity_id: lightEntity.entity_id,
        cmd_id: "light.on",
        params: {color_temperature: Math.round(value)}
      }).subscribe({next: res => {
        this.onMessage.emit({
          severity: "success",
          summary: `Light ${this.lightEntity?.entity_id} temperature ${Math.round(value)}%`
        });
      },
        error: (err: HttpErrorResponse) => {
          this.onMessage.emit({
            severity: "error",
            detail: `Error setting ${this.lightEntity?.entity_id} temperature to ${Math.round(value)}% : ${err.error.code} - ${err.error.message}`
          })
        }
    });
      // console.debug("Set saturation", lightEntity, value);
    }
  }

  setColor($event: any) {
    console.debug("Set", this.lightColor);
    if (this.remote && this.lightEntity && this.lightColor) {
      this.server.executeRemotetCommand(this.remote, {
        entity_id: this.lightEntity.entity_id,
        cmd_id: "light.on",
        params: {
          hue: Math.round(this.lightColor.h),
          saturation: Math.round(255*this.lightColor.s/100),
          brightness: Math.round(255*this.lightColor.b/100)
        }
      }).subscribe({next: res => {
        this.onMessage.emit({
          severity: "success",
          summary: `Light ${this.lightEntity?.entity_id} color ${JSON.stringify(this.lightColor)}`
        });
      },
        error: (err: HttpErrorResponse) => {
          this.onMessage.emit({
            severity: "error",
            detail: `Error setting ${this.lightEntity?.entity_id} color to ${JSON.stringify(this.lightColor)} : ${err.error.code} - ${err.error.message}`
          })
        }
    });
    }
  }
}
