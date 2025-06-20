import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation
} from '@angular/core';
import {MessageService} from "primeng/api";
import {ServerService} from "../../server.service";
import {Activity,Entity, Remote, RemoteMap} from "../../interfaces";
import {NgIf} from "@angular/common";
import {OrderListModule} from "primeng/orderlist";
import {IconComponent} from "../../controls/icon/icon.component";
import {ToastModule} from "primeng/toast";
import {Button} from "primeng/button";
import {DialogModule} from "primeng/dialog";
import {DockModule} from "primeng/dock";
import {Helper} from "../../helper";
import {InputNumberModule} from "primeng/inputnumber";
import {FormsModule} from "@angular/forms";
import {Tooltip} from "primeng/tooltip";
import {Select} from "primeng/select";

export interface IncludedEntity {
  entityId: string;
  name: string;
}

@Component({
    selector: 'app-activity-entities',
    imports: [
        OrderListModule,
        IconComponent,
        ToastModule,
        NgIf,
        Button,
        DialogModule,
        DockModule,
        InputNumberModule,
        FormsModule,
        Tooltip,
        Select
    ],
    templateUrl: './activity-entities.component.html',
    styleUrl: './activity-entities.component.css',
    providers: [MessageService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class ActivityEntitiesComponent {
  @Input() remote: Remote | undefined;
  @Input('activity') set activity(activity: Activity | undefined)
  {
    this._activity = activity;
    this.includedEntities = activity?.options?.included_entities?.map(entity => {
      return { name: Helper.getEntityName(entity!),
        entityId: entity.entity_id!
      }}) ?? [];
  }
  get activity(): Activity | undefined { return this._activity; }
  private _activity: Activity | undefined;
  @Input() editable = true;
  @Output() onUpdate = new EventEmitter<{activity:Activity, includedEntities:IncludedEntity[]}>();
  currentEntity: IncludedEntity | undefined;
  selectedEntity: Entity | undefined;
  entityDialogVisible = false;

  templates: RemoteMap[] = [];
  includedEntities: IncludedEntity[] = []
  entities: Entity[] = [];

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
    this.server.getTemplateRemoteMap().subscribe(templates => {
      this.templates = templates;
      this.cdr.detectChanges();
    });
    this.server.entities$.subscribe(entities => {
      this.entities = entities;
    })
  }

  findEntity(entity: IncludedEntity): Entity | undefined {
    return this.entities.find(localEntity => entity.entityId === localEntity.entity_id);
  }

  updateIncludedEntities($event: any) {
    if (!this.activity) return;
    this.onUpdate.emit({activity: this.activity, includedEntities: this.includedEntities});
  }

  delete(includedEntity: IncludedEntity) {
    const index = this.includedEntities.indexOf(includedEntity);
    if (index != undefined && index != -1) {
      this.includedEntities.splice(index, 1);
      this.updateIncludedEntities(null);
      this.cdr.detectChanges();
    }
  }

  add($event: MouseEvent) {
    this.currentEntity = {
      name: this.entities[0] ? Helper.getEntityName(this.entities[0]) : "",
      entityId: this.entities[0]?.entity_id ?? ""
    };
    this.includedEntities.push(this.currentEntity);
    this.selectedEntity = this.entities.find(entity => entity.entity_id === this.currentEntity?.entityId);
    this.entityDialogVisible = true;
    this.cdr.detectChanges();
//    this.sequenceName = sequenceName;
  }

  protected readonly Helper = Helper;

  entitySelected($event: any) {
    if (this.selectedEntity && this.currentEntity) {
      this.currentEntity.entityId = this.selectedEntity.entity_id!;
      this.currentEntity.name = Helper.getEntityName(this.selectedEntity);
      this.entityDialogVisible = false;
      this.cdr.detectChanges();
    }
  }
}
