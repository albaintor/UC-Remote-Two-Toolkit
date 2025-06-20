import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewEncapsulation} from '@angular/core';
import {OverlayPanelModule} from "primeng/overlaypanel";
import {MessageService, SharedModule} from "primeng/api";
import {ServerService} from "../../server.service";
import {Activity, Entity} from "../../interfaces";
import {DialogModule} from "primeng/dialog";
import {CommonModule} from "@angular/common";
import {ChipModule} from "primeng/chip";
import {Helper} from "../../helper";
import {TooltipModule} from "primeng/tooltip";

@Component({
    selector: 'app-entity-viewer',
    imports: [
        OverlayPanelModule,
        SharedModule,
        DialogModule,
        CommonModule,
        ChipModule,
        TooltipModule
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
  private entities: Entity[] = [];
  private activities: Activity[] = [];
  included_activities: Activity[] | undefined;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
    server.entities$.subscribe(entities => this.entities = entities);
    server.activities$.subscribe(activities => this.activities = activities);
  }

  view(entity: Entity) {
    this.entity = entity;
    this.included_activities = this.activities.filter(activity => activity.options?.included_entities?.
      find(included_entity => included_entity.entity_id === entity.entity_id));
    this.visible = true;
    this.cdr.detectChanges();
  }

  protected readonly Helper = Helper;
}
