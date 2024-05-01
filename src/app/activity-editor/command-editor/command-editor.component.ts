import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewChild} from '@angular/core';
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
import {jsonHelpUsage} from "@angular/cli/src/command-builder/utilities/json-help";
import {DialogModule} from "primeng/dialog";
import {IconSelectorComponent} from "../../icon-selector/icon-selector.component";
import {RemoteOperationsComponent} from "../remote-operations/remote-operations.component";
import {DropdownModule} from "primeng/dropdown";

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
    DropdownModule
  ],
  templateUrl: './command-editor.component.html',
  styleUrl: './command-editor.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommandEditorComponent {
  @Input() remote: Remote | undefined;
  command: ActivityPageCommand | undefined;
  templates: RemoteMap[] | undefined;
  stateOptions: any[] = [
    { label: 'Text', value: 'text' },
    { label: 'Icon', value: 'icon' }
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
    this.entities = this.server.getEntities();
    this.server.entities$.subscribe(entities => this.entities = entities);
  }


  getCommands(entity: Entity)
  {
    return this.configEntityCommands.filter(command => {command.id.startsWith(entity.entity_id!)});
  }

  show(remote: Remote, activity: Activity, command: ActivityPageCommand): void {
    this.remote = remote;
    this.activity = activity;
    this.activityEntities = this.activity?.options?.included_entities?.sort((a, b) =>
      Helper.getEntityName(a)!.localeCompare(Helper.getEntityName(b)!))!;
    this.command = command;
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
    if (this.command)
      if (this.command.media_player_id)
      {
        this.selectedEntity = this.activity?.options?.included_entities?.find(entity => entity.entity_id == this.command!.media_player_id);
        this.selectedCommand = undefined;
      }
      else if (this.command.command)
      {
        const command = this.command.command as Command;

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

  commandSelected($event: any) {
    if (!this.selectedCommand) return;
    this.command!.command = {entity_id: this.selectedEntity?.entity_id!, cmd_id: this.selectedCommand.cmd_id};
    this.messageService.add({severity: "info", summary: `Entity ${Helper.getEntityName(this.selectedEntity)}`,
      detail: `Entity id : ${this.selectedEntity?.entity_id}, command ${this.selectedCommand.cmd_id} assigned`});
    this.cdr.detectChanges();
  }
}
