import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, EventEmitter,
  Input, Output,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {ServerService} from "../../server.service";
import {MessageService} from "primeng/api";
import {
  Activity,
  ActivityPageCommand,
  Command,
  Entity,
  EntityCommand,
  EntityFeature,
  Remote,
  RemoteMap
} from "../../interfaces";
import {FormsModule} from "@angular/forms";
import {InputTextModule} from "primeng/inputtext";
import {InputNumberModule} from "primeng/inputnumber";
import {SelectButtonModule} from "primeng/selectbutton";
import {Helper} from "../../helper";
import {NgIf} from "@angular/common";
import {ToastModule} from "primeng/toast";
import {DialogModule} from "primeng/dialog";
import {IconSelectorComponent} from "../../icon-selector/icon-selector.component";
import {DropdownModule} from "primeng/dropdown";
import {ButtonModule} from "primeng/button";
import {GridItem} from "../../activity-viewer/activity-grid/activity-grid.component";

@Component({
  selector: 'app-command-editor',
  standalone: true,
  imports: [
    FormsModule,
    InputTextModule,
    InputNumberModule,
    SelectButtonModule,
    NgIf,
    ToastModule,
    DialogModule,
    IconSelectorComponent,
    DropdownModule,
    ButtonModule
  ],
  templateUrl: './command-editor.component.html',
  styleUrl: './command-editor.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class CommandEditorComponent {
  @Input() remote: Remote | undefined;
  @Output() updateItemWidth: EventEmitter<{gridItem: GridItem, width: number}> = new EventEmitter();
  @Output() updateItemHeight: EventEmitter<{gridItem: GridItem, height: number}> = new EventEmitter();
  @Output() addItem: EventEmitter<GridItem> = new EventEmitter();
  @Output() deleteItem: EventEmitter<GridItem> = new EventEmitter();
  templates: RemoteMap[] | undefined;
  stateOptions: any[] = [
    { label: 'Text', value: 'text' },
    { label: 'Icon', value: 'icon' },
    { label: 'Media Player', value: 'media_player' },
  ];
  protected readonly Helper = Helper;
  visible = false;
  @ViewChild(IconSelectorComponent) iconSelector: IconSelectorComponent | undefined;
  currentCommand: ActivityPageCommand | undefined;
  activity: Activity | undefined;
  entities: Entity[] = [];
  activityEntities: Entity[] = [];
  selectedEntity: Entity | undefined;
  configEntityCommands: EntityCommand[] = [];
  entityCommands: EntityCommand[] = [];
  selectedCommand: EntityCommand | undefined;
  featuresMap: EntityFeature[] = [];
  backupCommand : ActivityPageCommand | undefined;
  grid: (ActivityPageCommand | null)[] = [];
  gridItem: GridItem | undefined;
  mediaPlayers: Entity[] = [];

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
    this.server.getTemplateRemoteMap().subscribe(templates => {
      this.templates = templates;
      this.cdr.detectChanges();
    });
    this.server.getFeaturesMap().subscribe(featuresMap => {
      this.featuresMap = featuresMap;
      this.cdr.detectChanges();
    })
    const configCommands = localStorage.getItem("configCommands");
    if (configCommands)
      this.configEntityCommands = JSON.parse(configCommands);

    this.server.configCommands$.subscribe(entityCommands => {
      this.configEntityCommands = entityCommands;
    })
    this.entities = this.server.getCachedEntities();
    this.server.entities$.subscribe(entities => this.entities = entities);
  }


  getCommands(entity: Entity)
  {
    return this.configEntityCommands.filter(command => {command.id.startsWith(entity.entity_id!)});
  }

  show(remote: Remote, activity: Activity, gridItem: GridItem): void {
    console.debug("Editing command", activity, gridItem);
    this.remote = remote;
    this.activity = activity;
    this.activityEntities = this.activity?.options?.included_entities?.sort((a, b) =>
      Helper.getEntityName(a)!.localeCompare(Helper.getEntityName(b)!))!;
    this.mediaPlayers = this.activityEntities.filter(entity => entity.entity_type === 'media_player');
    this.gridItem = gridItem;
    this.backupCommand = JSON.parse(JSON.stringify(gridItem.item));
    this.visible = true;
    this.cdr.detectChanges();
    if (this.configEntityCommands.length == 0)
    {
      this.server.getConfigEntityCommands(this.remote!).subscribe(entityCommands => {
        this.configEntityCommands = entityCommands;
        this.cdr.detectChanges();
      })
    }
    this.initSelection();
    this.updateSelection();
  }

  initSelection()
  {
    if (this.gridItem?.item?.command)
      if (this.gridItem?.item?.media_player_id)
      {
        this.selectedEntity = this.activity?.options?.included_entities?.find(entity => entity.entity_id ==
          this.gridItem?.item?.media_player_id);
        this.selectedCommand = undefined;
      }
      else if (this.gridItem?.item?.command)
      {
        const command = this.gridItem?.item?.command as Command;

        this.selectedEntity = this.activity?.options?.included_entities?.find(entity => entity.entity_id === command?.entity_id);
        if (command.cmd_id && this.selectedEntity)
        {
          this.selectedCommand = this.configEntityCommands.find(entityCommand =>
            entityCommand.id.startsWith(this.selectedEntity?.entity_type!) &&
            command.cmd_id.endsWith(entityCommand.cmd_id));
        }
      }
  }

  updateSelection()
  {
    if (!this.selectedEntity && this.activity?.options?.included_entities
      && this.activity?.options?.included_entities?.length > 0)
    {
      this.selectedEntity = this.activity!.options!.included_entities[0];
    }
    if (this.selectedEntity?.entity_id) {
      this.entityCommands = this.configEntityCommands.filter(command =>
        command.id.startsWith(this.selectedEntity?.entity_type!)).sort((a, b) =>
         Helper.getEntityName(a)!.localeCompare(Helper.getEntityName(b)!));
      const entity = this.entities.find(entity => entity.entity_id === this.selectedEntity?.entity_id);
      if (this.featuresMap.length > 0 && entity)
      {
        const features = this.featuresMap.find(featuresMap => featuresMap.entity_type === entity.entity_type);
        if (features)
        {
          const commands: string[] = [];
          features.features_map.forEach(command => {
            if (!command.feature || entity.features?.includes(command.feature))
              commands.push(...command.commands);
          });
          // console.log("Features", features, commands, this.selectedEntity, entity);
          this.entityCommands = this.entityCommands.filter(command => commands.includes(command.id));
        }
      }
      if (!this.selectedCommand || !this.entityCommands.find(command =>
        this.selectedCommand?.id === command.id))
      {
        this.selectedCommand = this.entityCommands.length > 0 ? this.entityCommands[0] : undefined;
      }

    }
    this.cdr.detectChanges();
  }

  selectIcon(command: ActivityPageCommand) {
    this.currentCommand = command;
    this.iconSelector?.show(this.remote!);
  }

  iconSelected($event: string) {
    if (!this.currentCommand) return;
    this.currentCommand.icon = $event;
    this.currentCommand.type = 'icon';
    this.cdr.detectChanges();
  }

  entitySelected($event: any) {
    this.updateSelection();
  }

  mediaPlayerSelected($event: any) {
    if (!this.gridItem?.item || !this.selectedEntity) return;
    this.gridItem.item.media_player_id = this.selectedEntity.entity_id;
    this.cdr.detectChanges();
  }

  commandSelected($event: any) {
    if (!this.gridItem?.item)
    {
      this.addItem.emit(this.gridItem);
      return;
    }
    if (!this.selectedCommand) return;
    if (this.gridItem.item.type === "media_player")
    {
      delete this.gridItem.item.command
      if (this.selectedEntity?.entity_type !== 'media_player') this.selectedEntity = undefined;
      this.cdr.detectChanges();
      return;
    }
    this.gridItem.item.command = {entity_id: this.selectedEntity?.entity_id!, cmd_id: this.selectedCommand.id};
    this.messageService.add({severity: "info", summary: `Entity ${Helper.getEntityName(this.selectedEntity)}`,
      detail: `Entity id : ${this.selectedEntity?.entity_id}, command ${this.selectedCommand.cmd_id} assigned`});
    this.cdr.detectChanges();
  }

  undoChanges($event: MouseEvent) {
    if (!this.gridItem) return;
    this.gridItem.item = this.backupCommand;
    this.backupCommand = JSON.parse(JSON.stringify(this.gridItem.item));
    this.initSelection();
    this.updateSelection();
  }

  checkGridHeight($event: number) {
    if (!this.gridItem) return;
    this.updateItemHeight.emit({gridItem: this.gridItem, height: $event});
  }

  checkGridWidth($event: number) {
    if (!this.gridItem) return;
    this.updateItemWidth.emit({gridItem: this.gridItem, width: $event});
  }

  addCommand() {
    if (!this.gridItem?.item)
    {
      this.addItem.emit(this.gridItem);
      this.visible = false;
      this.cdr.detectChanges();
    }
  }

  deleteCommand() {
    if (this.gridItem?.item)
    {
      this.deleteItem.emit(this.gridItem);
      this.visible = false;
      this.cdr.detectChanges();
    }
  }
}
