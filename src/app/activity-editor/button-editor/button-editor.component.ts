import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ButtonEditorComponent {
  // @Input() items: HTMLElement[];
  @Input() button: ButtonMapping | undefined;
  @Input() remote: Remote | undefined;
  @Input() activity: Activity | undefined;
  @Output() buttonChanged = new EventEmitter<ButtonMapping>();
  visible = false;
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
    console.debug("Editing command", this.button);
    this.activityEntities = this.activity?.options?.included_entities?.sort((a, b) =>
      Helper.getEntityName(a)!.localeCompare(Helper.getEntityName(b)!))!;
    if (this.button)
      this.backupCommand = JSON.parse(JSON.stringify(this.button));
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
    this.selectedEntity = undefined;
    this.selectedEntityLong = undefined;
    this.selectedCommand = undefined;
    this.selectedCommandLong = undefined;
    if (this.button?.short_press)
    {
      const command = this.button?.short_press;
      this.selectedEntity = this.activity?.options?.included_entities?.find(entity => entity.entity_id === command?.entity_id);
      if (command.cmd_id && this.selectedEntity)
      {
        this.selectedCommand = this.configEntityCommands.find(entityCommand =>
          entityCommand.id.startsWith(this.selectedEntity?.entity_type!) &&
          command.cmd_id.endsWith(entityCommand.cmd_id));
        /*if (!this.selectedCommand)
          this.selectedCommand = {id: command?.cmd_id, cmd_id: command?.cmd_id, name: {en: command?.cmd_id}} as any;*/
      }
    }
    if (this.button?.long_press)
    {
      const command = this.button?.long_press;
      this.selectedEntityLong = this.activity?.options?.included_entities?.find(entity => entity.entity_id === command?.entity_id);
      if (command.cmd_id && this.selectedEntityLong)
      {
        this.selectedCommandLong = this.configEntityCommands.find(entityCommand =>
          entityCommand.id.startsWith(this.selectedEntityLong?.entity_type!) &&
          command.cmd_id.endsWith(entityCommand.cmd_id));
        /*if (!this.selectedCommandLong)
          this.selectedCommandLong = {id: command?.cmd_id, cmd_id: command?.cmd_id, name: {en: command?.cmd_id}} as any;*/
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
        //this.selectedCommand = this.entityCommands.length > 0 ? this.entityCommands[0] : undefined;
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
        //this.selectedCommandLong = this.entityCommandsLong.length > 0 ? this.entityCommandsLong[0] : undefined;
      }

    }
    this.cdr.detectChanges();
  }

  entitySelected($event: any) {
    this.updateSelection();
  }

  commandChanged(command: Command | undefined, selectedEntity: Entity | undefined,
                 selectedCommand: EntityCommand | undefined): boolean
  {
    return command?.entity_id != selectedEntity?.entity_id || command?.cmd_id != selectedCommand?.cmd_id;
  }

  commandSelected($event: any) {
    if (!this.button) return;
    if (!this.selectedCommand) return;
    if (!this.commandChanged(this.button.short_press, this.selectedEntity, this.selectedCommand)) return;
    //TODO : handle parameters
    this.buttonChanged.emit(this.button);
    this.button.short_press = {entity_id: this.selectedEntity?.entity_id!, cmd_id: this.selectedCommand.id};
    this.messageService.add({severity: "info", summary: `Entity ${Helper.getEntityName(this.selectedEntity)}`,
      detail: `Entity id : ${this.selectedEntity?.entity_id}, command ${this.selectedCommand.cmd_id} assigned`});
    this.cdr.detectChanges();
  }

  commandSelectedLong($event: any) {
    if (!this.button) return;
    if (!this.selectedCommandLong) return;
    if (!this.commandChanged(this.button.long_press, this.selectedEntityLong, this.selectedCommandLong)) return;
    this.buttonChanged.emit(this.button);
    this.button.long_press = {entity_id: this.selectedEntityLong?.entity_id!, cmd_id: this.selectedCommandLong.id};
    this.messageService.add({severity: "info", summary: `Entity ${Helper.getEntityName(this.selectedEntity)}`,
      detail: `Entity id : ${this.selectedEntityLong?.entity_id}, command ${this.selectedCommandLong.cmd_id} assigned`});
    this.cdr.detectChanges();
  }

  undoChanges($event: MouseEvent) {
    if (!this.backupCommand) return;
    this.button = this.backupCommand;
    this.backupCommand = JSON.parse(JSON.stringify(this.button));
    this.initSelection();
    this.updateSelection();
    this.buttonChanged.emit(this.button);
  }

  deleteCommand()
  {
    delete this.button?.long_press;
    delete this.button?.short_press;
    this.cdr.detectChanges();
    this.buttonChanged.emit(this.button);
  }

  protected readonly Helper = Helper;

  assignShortPress() {
    this.button!.short_press = {} as any;
    this.cdr.detectChanges();
    this.buttonChanged.emit(this.button);
  }

  assignLongPress() {
    this.button!.long_press = {} as any;
    this.cdr.detectChanges();
    this.buttonChanged.emit(this.button);
  }

  removeElement(object: any, element: string) {
    delete object[element];
    this.cdr.detectChanges();
    this.buttonChanged.emit(this.button);
  }
}
