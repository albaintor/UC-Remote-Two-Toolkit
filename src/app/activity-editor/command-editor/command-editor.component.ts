import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input, OnInit,
  Output,
  ViewEncapsulation
} from '@angular/core';
import {Helper} from "../../helper";
import {DropdownModule} from "primeng/dropdown";
import {MessageService, SharedModule} from "primeng/api";
import {ServerService} from "../../server.service";
import {
  Activity,
  ActivityPageCommand,
  Command,
  Entity,
  EntityCommand, EntityCommandParameter,
  EntityFeature, Remote, RemoteData,
  RemoteMap
} from "../../interfaces";
import {NgForOf, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {ToastModule} from "primeng/toast";
import {InputNumberModule} from "primeng/inputnumber";
import {CheckboxModule} from "primeng/checkbox";

@Component({
  selector: 'app-command-editor',
  standalone: true,
  imports: [
    DropdownModule,
    SharedModule,
    NgIf,
    FormsModule,
    ToastModule,
    NgSwitch,
    NgSwitchCase,
    NgForOf,
    InputNumberModule,
    CheckboxModule,
    NgSwitchDefault
  ],
  templateUrl: './command-editor.component.html',
  styleUrl: './command-editor.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class CommandEditorComponent implements OnInit {
  command: Command | undefined;
  @Input('command') set _command(value: Command | undefined) {
    this.command = value;
    if (value) this.backupCommand = JSON.parse(JSON.stringify(value));
    this.initSelection();
  }

  uiCommand:  ActivityPageCommand | undefined;
  @Input('uiCommand') set _uiCommand(value: ActivityPageCommand | undefined) {
    this.uiCommand = value;
    this.command = undefined;
    if (this.uiCommand?.command && typeof this.uiCommand?.command !== 'string') {
      this.command = (this.uiCommand.command as Command);
    }
    if (value?.command)
      this.backupCommand = JSON.parse(JSON.stringify(value.command));
    this.initSelection();
  }

  activity: Activity | undefined;
  @Input('activity') set _activity(value: Activity | undefined) {
    this.activity = value;
    if (value) {
      this.activityEntities = this.activity?.options?.included_entities?.sort((a, b) =>
        Helper.getEntityName(a)!.localeCompare(Helper.getEntityName(b)!))!;
      this.mediaPlayers = this.activityEntities.filter(entity => entity.entity_type === 'media_player');
    }
    this.initSelection();
  }
  remote: Remote | undefined;
  @Input('remote') set _remote(value: Remote | undefined) {
    this.remote = value;
    if (this.remote)
      this.server.getConfigEntityCommands(this.remote).subscribe(entityCommands => {
        this.configEntityCommands = entityCommands;
        this.cdr.detectChanges();
      })
    this.initSelection();
  }

  @Output() updateItem: EventEmitter<ActivityPageCommand | Command> = new EventEmitter();
  backupCommand: Command | undefined;
  protected readonly Helper = Helper;
  templates: RemoteMap[] | undefined;
  configEntityCommands: EntityCommand[] = [];
  entityCommands: EntityCommand[] = [];
  selectedCommand: EntityCommand | undefined;
  selectedEntity: Entity | undefined;
  entities: Entity[] = [];
  activityEntities: Entity[] = [];
  mediaPlayers: Entity[] = [];

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
    this.server.getTemplateRemoteMap().subscribe(templates => {
      this.templates = templates;
      this.cdr.detectChanges();
    });
    const data = localStorage.getItem("remoteData");
    if (data) {
      const remoteData: RemoteData = JSON.parse(data);
      if (remoteData.configCommands)
        this.configEntityCommands = remoteData.configCommands;
    }

    this.server.configCommands$.subscribe(entityCommands => {
      this.configEntityCommands = entityCommands;
    })
    this.entities = this.server.getCachedEntities();
    this.server.entities$.subscribe(entities => this.entities = entities);
  }

  ngOnInit(): void {
    this.server.getConfigEntityCommands(this.remote!).subscribe(entityCommands => {
      this.configEntityCommands = entityCommands;
      this.cdr.detectChanges();
    })
  }

  getCommand(): Command | undefined
  {
    if (this.uiCommand) return (this.uiCommand.command as Command);
    return this.command;
  }

  initSelection()
  {
    let command = this.getCommand();

    if (command)
      if (this.uiCommand?.media_player_id)
        this.selectedEntity = this.activityEntities?.find(entity => entity.entity_id ==
          this.uiCommand?.media_player_id);
      else if (command?.entity_id && this.remote)
        this.loadEntity(command.entity_id);
    this.updateSelection();
  }

  loadEntity(entity_id: string)
  {
    if (!this.remote) return;
    this.server.getRemotetEntity(this.remote, entity_id).subscribe(entity => {
      this.activityEntities = this.activityEntities.map(activityEntity =>
        activityEntity.entity_id === entity.entity_id ? Object.assign(activityEntity, entity) : activityEntity);
      this.selectedEntity = this.activityEntities.find(activityEntity => activityEntity.entity_id == entity_id);
      console.log("Extracted entity", this.selectedEntity);
      this.updateSelection();
    })
  }

  getSelectionItems(parameter: EntityCommandParameter)
  {
    const source = parameter.items?.source;
    const field = parameter.items?.field;
    if (!source || !field)
    {
      if (parameter.values) return Helper.getItems(parameter.values);
      return [];
    }
    if ((this.selectedEntity as any)?.[source]?.[field])
      return Helper.getItems((this.selectedEntity as any)?.[source]?.[field])
    return [];
  }

  updateSelection()
  {
    this.selectedCommand = undefined;
    let command = this.getCommand();

    if (this.selectedEntity?.entity_id) {
      this.entityCommands = this.configEntityCommands.filter(command =>
        this.selectedEntity?.entity_commands?.includes(command.id)).sort((a, b) =>
        Helper.getEntityName(a)!.localeCompare(Helper.getEntityName(b)!));

      if (this.selectedEntity?.options?.simple_commands)
      {
        this.entityCommands.push(...this.selectedEntity.options.simple_commands.map(command => { return {
            id: command, cmd_id: command, name: {en: command}
          }})
        );
      }

      if (command?.cmd_id && this.selectedEntity)
      {
        this.selectedCommand = this.entityCommands.find(entityCommand =>
          command.cmd_id === entityCommand.cmd_id ||
          (entityCommand.id.startsWith(this.selectedEntity?.entity_type!) &&
            command.cmd_id.endsWith(entityCommand.cmd_id)));
      }

      if (!this.selectedCommand || !this.selectedCommand.params) delete this.command?.params;

      if (this.command && this.selectedCommand)
      {
        if (this.selectedCommand.params && !this.command.params)
          this.command.params = {};

        // Remove invalid params
        if (this.command.params)
        for (const [key, value] of Object.entries(this.command.params)) {
          if (!this.selectedCommand.params?.find(param => param.param === key))
            delete this.command.params[key];
        }

        /*this.selectedCommand.params?.forEach(params => {

        })*/
      }
    }
    console.log("Entity & command selected", this.selectedEntity, this.selectedCommand);
    this.cdr.detectChanges();
  }

  entitySelected($event: any) {
    if (this.selectedEntity?.entity_id)
      this.loadEntity(this.selectedEntity.entity_id);
    this.updateSelection();
  }

  mediaPlayerSelected($event: any) {
    if (!this.uiCommand || !this.selectedEntity) return;
    this.uiCommand.media_player_id = this.selectedEntity.entity_id;
    this.cdr.detectChanges();
  }

  commandSelected($event: any) {
    if (!this.selectedCommand) return;
    if (this.uiCommand?.type === "media_player")
    {
      delete this.uiCommand.command
      if (this.selectedEntity?.entity_type !== 'media_player') this.selectedEntity = undefined;
      this.cdr.detectChanges();
      return;
    }
    const command = this.getCommand();
    if (!command || !this.selectedEntity) return;
    command.entity_id = this.selectedEntity.entity_id!;
    command.cmd_id = this.selectedCommand.id;

    if (!this.selectedCommand || !this.selectedCommand.params) delete this.command?.params;
    if (this.command && this.selectedCommand) {
      if (this.selectedCommand.params && !this.command.params)
        this.command.params = {};

      // Remove invalid params
      if (this.command.params)
        for (const [key, value] of Object.entries(this.command.params)) {
          if (!this.selectedCommand.params?.find(param => param.param === key))
            delete this.command.params[key];
        }
    }

    this.messageService.add({key: 'commandEditor', severity: "info", summary: `Entity ${Helper.getEntityName(this.selectedEntity)}`,
      detail: `Entity id : ${this.selectedEntity?.entity_id}, command ${this.selectedCommand.cmd_id} assigned`});
    this.cdr.detectChanges();
  }
}
