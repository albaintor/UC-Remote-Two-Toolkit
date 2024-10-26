import {
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  EventEmitter,
  Input, OnDestroy, OnInit,
  Output,
  TemplateRef,
  ViewEncapsulation
} from '@angular/core';
import {ClimateEntityState, LightEntityState} from "../../websocket/remote-websocket-instance";
import {Remote} from "../../interfaces";
import { Helper } from '../../helper';
import {ServerService} from "../../server.service";
import {WebsocketService} from "../../websocket/websocket.service";
import {Button} from "primeng/button";
import {CdkDragHandle} from "@angular/cdk/drag-drop";
import {ColorPickerModule} from "primeng/colorpicker";
import {NgIf, NgTemplateOutlet} from "@angular/common";
import {SliderComponent} from "../../controls/slider/slider.component";
import {TooltipModule} from "primeng/tooltip";
import {KnobModule} from "primeng/knob";
import {FormsModule} from "@angular/forms";
import {DropdownOverComponent} from "../../controls/dropdown-over/dropdown-over.component";
import {TagModule} from "primeng/tag";
import {ButtonComponent} from "../../controls/button/button.component";
import {debounceTime, map, Subject, Subscription} from "rxjs";
import {distinctUntilChanged} from "rxjs/operators";
import {Message} from "primeng/api";
import {HttpErrorResponse} from "@angular/common/http";

type HavcMode = 'OFF' |'HEAT'|'COOL'|'HEAT_COOL'|'FAN'|'AUTO';

const HAVC_MODES: {label: string, value: HavcMode}[] = [
  {label: "Off", value: "OFF"},
  {label: "Heat", value: "HEAT"},
  {label: "Cool", value: "COOL"},
  {label: "Heat & cool", value: "HEAT_COOL"},
  {label: "Fan", value: "FAN"},
  {label: "Auto", value: "AUTO"},
];

const HAVC_FEATURES_MAP: {[type:string]: string} = {
  "OFF": "on_off",
  "HEAT": "heat",
  "COOL": "cool",
  "FAN": "fan",
};


@Component({
  selector: 'app-climate-entity',
  standalone: true,
  imports: [
    Button,
    CdkDragHandle,
    ColorPickerModule,
    NgIf,
    SliderComponent,
    TooltipModule,
    NgTemplateOutlet,
    KnobModule,
    FormsModule,
    DropdownOverComponent,
    TagModule,
    ButtonComponent
  ],
  templateUrl: './climate-entity.component.html',
  styleUrl: './climate-entity.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ClimateEntityComponent implements OnInit, OnDestroy {
  climateEntity: ClimateEntityState | undefined;
  @Input("climateEntity") set _climateEntity(climateEntity: ClimateEntityState | undefined)
  {
    this.climateEntity = climateEntity;
    this.update();
    this.cdr.detectChanges();
  }
  @Input() remote: Remote | undefined;
  @Input() headerTemplate : TemplateRef<HTMLAreaElement> | undefined;
  @Input() scale = 1;
  @Input() closable: boolean = false;
  @Output() onClose: EventEmitter<ClimateEntityState> = new EventEmitter();
  @Output() onMessage: EventEmitter<Message> = new EventEmitter();
  protected readonly Helper = Helper;
  target_temperature_step = 0.5;
  min_temperature = 10;
  max_temperature = 30;
  temperature_unit = "°C";
  havcModes: {label: string, value: HavcMode}[] = [...HAVC_MODES];
  havcMode: HavcMode | undefined;
  targetTemperature$ = new Subject<number>();
  targetTemperatureSubscription: Subscription | undefined;

  constructor(private server:ServerService, protected websocketService: WebsocketService, private cdr:ChangeDetectorRef) { }

  ngOnInit(): void {
    this.websocketService.onClimateChange().subscribe(state => {
      if (state.find(item => item.entity_id === this.climateEntity?.entity_id))
      {
        console.debug("Changed climate", this.climateEntity);
        this.update();
        this.cdr.detectChanges();
      }
    });
  this.targetTemperatureSubscription = this.targetTemperature$.pipe(
    debounceTime(1000),
    distinctUntilChanged(),
    map(value => {
      if (!this.climateEntity || !this.remote) return;
      console.debug("Set temperature", this.climateEntity.entity_id, value);
      this.server.executeRemotetCommand(this.remote, {
        entity_id: this.climateEntity.entity_id,
        // cmd_id: "climate.target_temperature_c",
        cmd_id: "target_temperature",
        params: {
          temperature: this.climateEntity.new_state!.attributes!.target_temperature,
        }
    } as any).subscribe({
        next: res => {
          this.onMessage.emit({
            severity: "success",
            detail: `Set ${this.climateEntity?.entity_id} temperature to ${value}`
          });
        },
        error: (err: HttpErrorResponse) => {
          this.onMessage.emit({
            severity: "error",
            detail: `Error setting ${this.climateEntity?.entity_id} temperature mode to ${value} : ${err.error.code} - ${err.error.message}`
          })
        }
    });
  })).subscribe();
  }

  getLabel(value: HavcMode | undefined)
  {
    if (!value) return "";
    const item = HAVC_MODES.find(item => item.value === value);
    if (item) return item.label;
    return value;
  }

  // getStatusColor()
  // {
  //   switch(this.havcMode)
  //   {
  //     case "OFF": return "rgba(83,83,83,0.74)";
  //     case "HEAT": return "#ed440c";
  //     case "COOL": return "#23a1f3";
  //     case "FAN": return "#51b15d";
  //     case "HEAT_COOL":
  //     case "AUTO": return "#f3d023";
  //     default: return "#eaeaea";
  //   }
  // }

  getStatusSeverity()
  {
    switch(this.havcMode)
    {
      case "OFF": return "secondary";
      case "HEAT": return "warning";
      case "COOL": return "info";
      case "FAN": return "success";
      case "HEAT_COOL":
      case "AUTO": return "contrast";
      default: return "contrast";
    }
  }


  getColor()
  {
    const modes = this.havcModes.map(item => item.value);
    if ((modes.includes("HEAT") && modes.includes("COOL")) || modes.includes("HEAT_COOL")) return "#f3d023";
    if (modes.includes("HEAT") && !modes.includes("COOL") && !modes.includes("HEAT_COOL")) {
      return "#ed440c";
    }
    if (modes.includes("COOL")) { return "#23a1f3"}
    return "rgba(46,46,46,0.74)";
  }

  update()
  {
    if (!this.climateEntity) return;
    if (this.climateEntity.new_state?.options)
    {
      if (this.climateEntity.new_state.options.min_temperature)
        this.min_temperature = this.climateEntity.new_state.options.min_temperature;
      if (this.climateEntity.new_state.options.max_temperature)
        this.max_temperature = this.climateEntity.new_state.options.max_temperature;
      if (this.climateEntity.new_state.options.target_temperature_step)
        this.target_temperature_step = this.climateEntity.new_state.options.target_temperature_step;
    }
    if (this.climateEntity.new_state?.features)
    {
      //TODO the way the havc modes are handled by the remote are obscure
      this.havcModes = HAVC_MODES.filter(mode =>
        this.climateEntity!.new_state!.features!.includes(HAVC_FEATURES_MAP[mode.value]) ||
        (mode.value === "AUTO" && this.climateEntity?.new_state?.attributes?.fan_mode));
    }
    if (this.climateEntity.new_state?.attributes?.state)
    {
      this.havcMode = this.climateEntity.new_state.attributes.state as any;
    }
    this.cdr.detectChanges();
  }

  checkFeature(lightEntityState: LightEntityState, feature: string | string[]): boolean
  {
    if (!lightEntityState.new_state?.features) return false;
    const features = (Array.isArray(feature)) ? feature as string[] : [feature];
    return lightEntityState.new_state.features.find(item => features.includes(item)) !== undefined;
  }

  closeEntity() {
    if (!this.climateEntity) return;
    this.onClose.emit(this.climateEntity);
    this.cdr.detectChanges();
  }

  powerToggle() {
    if (!this.remote || !this.climateEntity) return;
    if (!this.checkFeature(this.climateEntity, 'on_off')) return;
    if (this.climateEntity?.new_state?.attributes?.state !== 'ON') {
      this.server.executeRemotetCommand(this.remote, {
        entity_id: this.climateEntity.entity_id,
        cmd_id: "climate.on"
      }).subscribe();
      return;
    }
    else this.server.executeRemotetCommand(this.remote, {
      entity_id: this.climateEntity.entity_id,
      cmd_id: "climate.off"
    }).subscribe();
  }

  isOn(): boolean {
    return this.climateEntity?.new_state?.attributes?.state !== 'OFF';
  }

  protected readonly Math = Math;

  setHavcMode(hvac_mode: HavcMode)
  {
    if (!this.remote || !this.climateEntity) return;
    this.server.executeRemotetCommand(this.remote, {
      entity_id: this.climateEntity.entity_id,
      cmd_id: "climate.hvac_mode",
      params: {
        hvac_mode: hvac_mode
      }
    }).subscribe({next: res=> {
          this.onMessage.emit({
            severity: "success",
            detail: `Set ${this.climateEntity?.entity_id} HAVC mode to ${hvac_mode}`
          });
        },
      error: (err: HttpErrorResponse) => {
          this.onMessage.emit({
            severity: "error",
            detail: `Error setting ${this.climateEntity?.entity_id} HAVC mode to ${hvac_mode} : ${err.error.code} - ${err.error.message}`
          })
      }}
    );
  }

  setTemperature($event: any) {
    if (!this.remote || !this.climateEntity) return;
    if (!this.checkFeature(this.climateEntity, 'target_temperature')) return;
    if (this.climateEntity?.new_state?.attributes?.target_temperature)
      this.targetTemperature$.next(this.climateEntity.new_state!.attributes!.target_temperature);
  }

  ngOnDestroy() {
    if (this.targetTemperatureSubscription) {
      this.targetTemperatureSubscription.unsubscribe();
      this.targetTemperatureSubscription = undefined;
    }
  }
}
