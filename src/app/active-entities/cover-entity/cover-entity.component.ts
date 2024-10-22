import {
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  EventEmitter,
  Input, OnInit,
  Output,
  TemplateRef,
  ViewEncapsulation
} from '@angular/core';
import {Remote} from "../../interfaces";
import {CoverEntityState, LightEntityState} from "../../websocket/remote-websocket-instance";
import {ServerService} from "../../server.service";
import {WebsocketService} from "../../websocket/websocket.service";
import {Helper} from "../../helper";
import {Button} from "primeng/button";
import {CdkDragHandle} from "@angular/cdk/drag-drop";
import {NgIf, NgTemplateOutlet} from "@angular/common";
import {SliderComponent} from "../../controls/slider/slider.component";
import {TooltipModule} from "primeng/tooltip";

@Component({
  selector: 'app-cover-entity',
  standalone: true,
  imports: [
    Button,
    CdkDragHandle,
    NgIf,
    SliderComponent,
    TooltipModule,
    NgTemplateOutlet
  ],
  templateUrl: './cover-entity.component.html',
  styleUrl: './cover-entity.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class CoverEntityComponent implements OnInit {
  @Input() coverEntity: CoverEntityState | undefined;
  @Input() remote: Remote | undefined;
  @Input() headerTemplate : TemplateRef<HTMLAreaElement> | undefined;
  @Input() scale = 1;
  @Input() closable: boolean = false;
  @Output() onClose: EventEmitter<CoverEntityState> = new EventEmitter();
  protected readonly Helper = Helper;

  constructor(private server:ServerService, protected websocketService: WebsocketService, private cdr:ChangeDetectorRef) { }

  ngOnInit(): void {
    this.websocketService.onCoverChange().subscribe(states => {
      console.debug("Cover updated", states);
      this.cdr.detectChanges();
    })
  }

  checkFeature(coverEntityState: CoverEntityState, feature: string | string[]): boolean
  {
    if (!coverEntityState.new_state?.features) return false;
    const features = (Array.isArray(feature)) ? feature as string[] : [feature];
    return coverEntityState.new_state.features.find(item => features.includes(item)) !== undefined;
  }

  executeCommand(command: string) {
    if (!this.remote || !this.coverEntity) return;
    this.server.executeRemotetCommand(this.remote, {
      entity_id: this.coverEntity.entity_id,
      cmd_id: command
    }).subscribe();
  }

  closeEntity() {
    if (!this.coverEntity) return;
    this.onClose.emit(this.coverEntity);
    this.cdr.detectChanges();
  }

  protected readonly Math = Math;

  setPosition(position: number) {
    if (!this.remote || !this.coverEntity) return;
    this.server.executeRemotetCommand(this.remote, {
      entity_id: this.coverEntity.entity_id,
      cmd_id: "cover.position",
      params: {
        position
      }
    }).subscribe(res => {
      this.cdr.detectChanges();
    });
  }
}
