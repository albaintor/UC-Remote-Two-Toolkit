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
import {CoverEntityState} from "../../websocket/remote-websocket-instance";
import {ServerService} from "../../server.service";
import {WebsocketService} from "../../websocket/websocket.service";
import {Helper} from "../../helper";
import {Button} from "primeng/button";
import {CdkDragHandle} from "@angular/cdk/drag-drop";
import {NgIf, NgTemplateOutlet} from "@angular/common";
import {SliderComponent} from "../../controls/slider/slider.component";
import {TooltipModule} from "primeng/tooltip";
import {ButtonComponent} from "../../controls/button/button.component";
import {ToastMessageOptions} from "primeng/api";
import {HttpErrorResponse} from "@angular/common/http";
import {ScrollingTextComponent} from "../../controls/scrolling-text/scrolling-text.component";
import {TagModule} from "primeng/tag";

@Component({
  selector: 'app-cover-entity',
  standalone: true,
  imports: [
    Button,
    CdkDragHandle,
    NgIf,
    SliderComponent,
    TooltipModule,
    NgTemplateOutlet,
    ButtonComponent,
    ScrollingTextComponent,
    TagModule
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
  @Output() onMessage: EventEmitter<ToastMessageOptions> = new EventEmitter();
  protected readonly Helper = Helper;

  constructor(private server:ServerService, protected websocketService: WebsocketService, private cdr:ChangeDetectorRef) { }

  ngOnInit(): void {
    this.websocketService.onCoverChange().subscribe(state => {
      if (state.find(item => item.entity_id === this.coverEntity?.entity_id))
      {
        console.debug("Changed cover", this.coverEntity);
        this.cdr.detectChanges();
      }
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
    }).subscribe({next: res => {
      this.onMessage.emit({severity: "success", summary: `Cover ${this.coverEntity?.entity_id} command ${command}`});
    },
      error: (err: HttpErrorResponse) => {
        this.onMessage.emit({
          severity: "error",
          detail: `Error executing ${this.coverEntity?.entity_id} command ${command} : ${err.error.code} - ${err.error.message}`
        })
      }
  });
  }

  getSeverity()
  {
    switch(this.coverEntity?.new_state?.attributes?.state)
    {
      case 'OPEN': return "success";
      case 'CLOSED': return "secondary";
      case 'OPENING': return "warn";
      case 'CLOSING': return "danger";
      default:
        return "info";
    }
  }

  isClosed(): boolean
  {
    return !(!this.coverEntity?.new_state?.attributes || this.coverEntity?.new_state?.attributes?.state === 'CLOSE');
  }

  isOpened(): boolean
  {
    return !(!this.coverEntity?.new_state?.attributes || this.coverEntity?.new_state?.attributes?.state === 'OPEN');
  }

  isMoving(): boolean
  {
    return !(!this.coverEntity?.new_state?.attributes ||
      (this.coverEntity?.new_state?.attributes?.state === 'OPENING' ||
        this.coverEntity?.new_state?.attributes?.state === 'CLOSING'));
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
    }).subscribe({next: res => {
      this.onMessage.emit({
        severity: "success",
        detail: `Cover ${this.coverEntity?.entity_id} set position ${position}`
      });
      this.cdr.detectChanges();
    },
      error: (err: HttpErrorResponse) => {
        this.onMessage.emit({
          severity: "error",
          detail: `Error setting ${this.coverEntity?.entity_id} position mode to ${position} : ${err.error.code} - ${err.error.message}`
        })
      }
  });
  }
}
