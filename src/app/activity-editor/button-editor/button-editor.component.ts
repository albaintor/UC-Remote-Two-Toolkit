import {
  AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter, HostListener,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import {
  Activity,
  ActivityPageCommand,
  ButtonMapping, Command,
  Entity,
  EntityCommand,
  EntityFeature,
  Remote,
  RemoteMap
} from "../../interfaces";
import {ButtonModule} from "primeng/button";
import {DialogModule} from "primeng/dialog";
import {DropdownModule} from "primeng/dropdown";
import {IconSelectorComponent} from "../../icon-selector/icon-selector.component";
import {InputNumberModule} from "primeng/inputnumber";
import {InputTextModule} from "primeng/inputtext";
import {NgIf} from "@angular/common";
import {PaginatorModule} from "primeng/paginator";
import {SelectButtonModule} from "primeng/selectbutton";
import {MessageService, SharedModule} from "primeng/api";
import {ToastModule} from "primeng/toast";
import {ServerService} from "../../server.service";
import {GridItem} from "../../activity-viewer/activity-grid/activity-grid.component";
import {Helper} from "../../helper";

@Component({
  selector: 'app-button-editor',
  standalone: true,
  imports: [
    ButtonModule,
    DialogModule,
    DropdownModule,
    IconSelectorComponent,
    InputNumberModule,
    InputTextModule,
    NgIf,
    PaginatorModule,
    SelectButtonModule,
    SharedModule,
    ToastModule
  ],
  templateUrl: './button-editor.component.html',
  styleUrl: './button-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonEditorComponent {
  // @Input() items: HTMLElement[];
  @Input() item: ButtonMapping | undefined;
  @Input() remote: Remote | undefined;
  @Input() activity: Activity | undefined;
  visible = false;
  currentCommand: ActivityPageCommand | undefined;
  entities: Entity[] = [];
  activityEntities: Entity[] = [];
  selectedEntity: Entity | undefined;
  selectedEntityLong: Entity | undefined;
  configEntityCommands: EntityCommand[] = [];
  entityCommands: EntityCommand[] = [];
  entityCommandsLong: EntityCommand[] = [];
  selectedCommand: EntityCommand | undefined;
  selectedCommandLong: EntityCommand | undefined;
  featuresMap: EntityFeature[] = [];
  backupCommand : ButtonMapping | undefined;
  templates: RemoteMap[] | undefined;

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

  show(): void {
    console.debug("Editing command", this.activity, this.item);
    this.activityEntities = this.activity?.options?.included_entities?.sort((a, b) =>
      Helper.getEntityName(a)!.localeCompare(Helper.getEntityName(b)!))!;
    if (this.item)
      this.backupCommand = JSON.parse(JSON.stringify(this.item));
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
    if (this.item?.short_press)
    {
      const command = this.item?.short_press;
      this.selectedEntity = this.activity?.options?.included_entities?.find(entity => entity.entity_id === command?.entity_id);
      if (command.cmd_id && this.selectedEntity)
      {
        this.selectedCommand = this.configEntityCommands.find(entityCommand =>
          entityCommand.id.startsWith(this.selectedEntity?.entity_type!) &&
          command.cmd_id.endsWith(entityCommand.cmd_id));
      }
    }
    if (this.item?.long_press)
    {
      const command = this.item?.long_press;
      this.selectedEntityLong = this.activity?.options?.included_entities?.find(entity => entity.entity_id === command?.entity_id);
      if (command.cmd_id && this.selectedEntityLong)
      {
        this.selectedCommandLong = this.configEntityCommands.find(entityCommand =>
          entityCommand.id.startsWith(this.selectedEntityLong?.entity_type!) &&
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
    if (!this.selectedEntityLong && this.activity?.options?.included_entities
      && this.activity?.options?.included_entities?.length > 0)
    {
      this.selectedEntityLong = this.activity!.options!.included_entities[0];
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
    if (this.selectedEntityLong?.entity_id) {
      this.entityCommandsLong = this.configEntityCommands.filter(command =>
        command.id.startsWith(this.selectedEntityLong?.entity_type!)).sort((a, b) =>
        Helper.getEntityName(a)!.localeCompare(Helper.getEntityName(b)!));
      const entity = this.entities.find(entity => entity.entity_id === this.selectedEntityLong?.entity_id);
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
          this.entityCommandsLong = this.entityCommandsLong.filter(command => commands.includes(command.id));
        }
      }
      if (!this.selectedCommandLong || !this.entityCommandsLong.find(command =>
        this.selectedCommandLong?.id === command.id))
      {
        this.selectedCommandLong = this.entityCommandsLong.length > 0 ? this.entityCommandsLong[0] : undefined;
      }

    }
    this.cdr.detectChanges();
  }

  entitySelected($event: any) {
    this.updateSelection();
  }

  commandSelected($event: any) {
    if (!this.item)
    {
      //this.addItem.emit(this.gridItem);
      return;
    }
    if (!this.selectedCommand) return;
    this.item.short_press = {entity_id: this.selectedEntity?.entity_id!, cmd_id: this.selectedCommand.id};
    this.messageService.add({severity: "info", summary: `Entity ${Helper.getEntityName(this.selectedEntity)}`,
      detail: `Entity id : ${this.selectedEntity?.entity_id}, command ${this.selectedCommand.cmd_id} assigned`});
    this.cdr.detectChanges();
  }

  commandSelectedLong($event: any) {
    if (!this.item)
    {
      //this.addItem.emit(this.gridItem);
      return;
    }
    if (!this.selectedCommandLong) return;
    this.item.long_press = {entity_id: this.selectedEntityLong?.entity_id!, cmd_id: this.selectedCommandLong.id};
    this.messageService.add({severity: "info", summary: `Entity ${Helper.getEntityName(this.selectedEntity)}`,
      detail: `Entity id : ${this.selectedEntityLong?.entity_id}, command ${this.selectedCommandLong.cmd_id} assigned`});
    this.cdr.detectChanges();
  }

  undoChanges($event: MouseEvent) {
    if (!this.backupCommand) return;
    this.item = this.backupCommand;
    this.backupCommand = JSON.parse(JSON.stringify(this.item));
    this.initSelection();
    this.updateSelection();
  }

  addCommand() {

  }

  deleteCommand()
  {

  }

  protected readonly Helper = Helper;

  assignShortPress() {
    this.item!.short_press = {} as any;
    this.cdr.detectChanges();
  }

  assignLongPress() {
    this.item!.long_press = {} as any;
    this.cdr.detectChanges();
  }

  removeElement(object: any, element: string) {
    delete object[element];
    this.cdr.detectChanges();
  }
}
