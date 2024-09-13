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
  EntityCommand,
  EntityFeature, Remote, RemoteData,
  RemoteMap
} from "../../interfaces";
import {NgIf} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {ToastModule} from "primeng/toast";

@Component({
  selector: 'app-command-editor',
  standalone: true,
  imports: [
    DropdownModule,
    SharedModule,
    NgIf,
    FormsModule,
    ToastModule
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
  /*@Output() addItem: EventEmitter<ActivityPageCommand | undefined> = new EventEmitter();
  @Output() deleteItem: EventEmitter<ActivityPageCommand | undefined> = new EventEmitter();*/
  protected readonly Helper = Helper;
  templates: RemoteMap[] | undefined;
  featuresMap: EntityFeature[] = [];
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
    this.server.getFeaturesMap().subscribe(featuresMap => {
      this.featuresMap = featuresMap;
      this.cdr.detectChanges();
    })
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
      else if (command)
        this.selectedEntity = this.activityEntities?.find(entity => entity.entity_id === command?.entity_id);

    this.updateSelection();
  }

  updateSelection()
  {
    this.selectedCommand = undefined;
    let command = this.getCommand();

    if (this.selectedEntity?.entity_id) {
      const selectedEntity = this.entities.find(entity => entity.entity_id == this.selectedEntity?.entity_id);
      this.entityCommands = this.configEntityCommands.filter(command =>
        command.id.startsWith(this.selectedEntity?.entity_type!)).sort((a, b) =>
        Helper.getEntityName(a)!.localeCompare(Helper.getEntityName(b)!));
      const entity = this.entities.find(entity => entity.entity_id === this.selectedEntity?.entity_id);
      if (this.featuresMap?.length > 0 && entity)
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
      if (selectedEntity?.options?.simple_commands)
      {
        this.entityCommands.push(...selectedEntity.options.simple_commands.map(command => { return {
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
    }
    this.cdr.detectChanges();
  }

  entitySelected($event: any) {
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
    this.messageService.add({key: 'commandEditor', severity: "info", summary: `Entity ${Helper.getEntityName(this.selectedEntity)}`,
      detail: `Entity id : ${this.selectedEntity?.entity_id}, command ${this.selectedCommand.cmd_id} assigned`});
    this.cdr.detectChanges();
  }


  /*addCommand() {
    if (!this.uiCommand) return;
    if (!this.selectedEntity)
    {
      this.selectedEntity = this.entities[0];
    }
    (this.uiCommand.command as Command) = {entity_id: this.selectedEntity!.entity_id!, cmd_id: ""};
    this.addItem.emit(this.gridItem);
    this.cdr.detectChanges();
  }

  deleteCommand() {
    if (this.gridItem?.item)
    {
      this.deleteItem.emit(this.gridItem);
      this.visible = false;
      this.cdr.detectChanges();
    }
  }*/

}
