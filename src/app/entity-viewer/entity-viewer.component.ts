import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewEncapsulation} from '@angular/core';
import {OverlayPanelModule} from "primeng/overlaypanel";
import {MessageService, SharedModule} from "primeng/api";
import {ServerService} from "../server.service";
import {Entity} from "../interfaces";
import {DialogModule} from "primeng/dialog";
import {CommonModule, NgForOf, NgIf} from "@angular/common";
import {AsPipe} from "../activity-viewer/activity-viewer.component";
import {ChipModule} from "primeng/chip";
import {Helper} from "../helper";

@Component({
  selector: 'app-entity-viewer',
  standalone: true,
  imports: [
    OverlayPanelModule,
    SharedModule,
    DialogModule,
    CommonModule,
    AsPipe,
    ChipModule
  ],
  templateUrl: './entity-viewer.component.html',
  styleUrl: './entity-viewer.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class EntityViewerComponent {
  panelStyle: any = { width: '70vw' };
  @Input() entity: Entity | undefined;
  visible = false;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
  }

  view(entity: Entity) {
    this.entity = entity;
    this.visible = true;
    this.cdr.detectChanges();
  }

  protected readonly Helper = Helper;
}
