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
  EntityCommand,
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
import {IconSelectorComponent} from "../../controls/icon-selector/icon-selector.component";
import {SelectModule} from "primeng/select";
import {ButtonModule} from "primeng/button";
import {RemoteGridItemComponent, GridItem} from "../remote-grid-item/remote-grid-item.component";
import {CommandEditorComponent} from "../command-editor/command-editor.component";

@Component({
    selector: 'app-ui-command-editor',
    imports: [
        FormsModule,
        InputTextModule,
        InputNumberModule,
        SelectButtonModule,
        NgIf,
        ToastModule,
        DialogModule,
        IconSelectorComponent,
        SelectModule,
        ButtonModule,
        CommandEditorComponent
    ],
    templateUrl: './ui-command-editor.component.html',
    styleUrl: './ui-command-editor.component.css',
    providers: [MessageService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class UiCommandEditorComponent {
  @Input() remote: Remote | undefined;
  @Input() gridItem: RemoteGridItemComponent | undefined;
  @Input() activity: Activity | undefined;
  @Input() gridCommands: ActivityPageCommand[] | undefined;
  @Input() grid : { width: number; height: number} | undefined;
  @Output() updateItem: EventEmitter<RemoteGridItemComponent> = new EventEmitter();
  @Output() addItem: EventEmitter<RemoteGridItemComponent> = new EventEmitter();
  @Output() deleteItem: EventEmitter<RemoteGridItemComponent> = new EventEmitter();
  templates: RemoteMap[] | undefined;
  stateOptions: any[] = [
    { label: 'Text', value: 'text' },
    { label: 'Icon', value: 'icon' },
    { label: 'Media Player', value: 'media_player' },
  ];
  protected readonly Helper = Helper;
  visible = false;
  @ViewChild(IconSelectorComponent) iconSelector: IconSelectorComponent | undefined;
  @ViewChild(CommandEditorComponent) commandEditor: CommandEditorComponent | undefined;
  gridItemSize =  {width: 4, height: 6};
  configEntityCommands: EntityCommand[] | undefined;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
    this.server.getTemplateRemoteMap().subscribe(templates => {
      this.templates = templates;
      this.cdr.detectChanges();
    });
    this.server.configCommands$.subscribe(config => this.configEntityCommands = config);
  }


  show(): void {
    console.debug("Editing command", this.activity, this.gridItem);
    if (this.gridItem?.item?.size)
      this.gridItemSize = {width: this.gridItem?.item.size.width, height: this.gridItem?.item.size.height};
    else
      this.gridItemSize = {width: 4, height: 6};
    this.visible = true;
    this.cdr.detectChanges();
  }

  selectIcon(command: ActivityPageCommand) {
    this.iconSelector?.show(this.remote!);
  }

  iconSelected($event: string) {
    if (!this.gridItem?.item) return;
    this.gridItem.item.icon = $event;
    this.gridItem.item.type = 'icon';
    this.cdr.detectChanges();
  }

  checkGridOverflow(): boolean
  {
    if (!this.gridItem?.item || !this.grid) return false;
    if (this.gridItem.item.location.x + this.gridItemSize.width > this.grid.width) return false;
    if (this.gridItem.item.location.y + this.gridItemSize.height > this.grid.height) return false;

    return true;
  }

  checkGridSize($event: number) {
    if (!this.gridItem?.item || !this.gridCommands) return;
    if (!this.checkGridOverflow() || !Helper.checkItem(this.gridItem.item, this.gridCommands,
      this.gridItem.item.location.x, this.gridItem.item.location.y,
       this.gridItemSize.width, this.gridItemSize.height))
    {
      console.debug("Changed item size overflow", this.gridItem, this.gridItemSize);
      this.messageService.add({severity: "warn",
        summary: `This item cannot be resized to ${this.gridItemSize.width} rows, ${this.gridItemSize.height} columns`});
      this.gridItemSize = {width: this.gridItem.item.size.width, height: this.gridItem.item.size.height};
      this.cdr.detectChanges();
      return;
    }
    this.gridItem.item.size = {width: this.gridItemSize.width, height: this.gridItemSize.height};
    console.debug("Changed item size", this.gridItem);
    this.updateItem.emit(this.gridItem);
    this.cdr.detectChanges();
  }

  addCommand() {
    if (!this.gridItem?.item) return;
    // if (!this.selectedEntity)
    // {
    //   this.selectedEntity = this.entities[0];
    // }
    (this.gridItem.item.command as Command) = {entity_id: "", cmd_id: ""};
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
  }

  updateCommand() {
    this.updateItem.emit(this.gridItem);
    this.cdr.detectChanges();
  }

  itemTypeSelected($event: any) {
    if (!this.gridItem?.item) return;
    if (this.gridItem.item.type === "text")
    {
      delete this.gridItem.item.icon;
      delete this.gridItem.item.media_player_id;
      this.gridItem.item.text = "Text";
      if (!this.gridItem.item.command) {
        this.gridItem.item.command = {entity_id: "", cmd_id: ""};
        this.commandEditor?.initSelection();
      }
    } else if (this.gridItem.item.type === "icon")
    {
      delete this.gridItem.item.text;
      delete this.gridItem.item.media_player_id;
      if (!this.gridItem.item.icon) this.gridItem.item.icon = "uc:info";
      if (!this.gridItem.item.command) {
        this.gridItem.item.command = {entity_id: "", cmd_id: ""};
        this.commandEditor?.initSelection();
      }
    }  else if (this.gridItem.item.type === "media_player")
    {
      delete this.gridItem.item.text;
      delete this.gridItem.item.icon;
      delete this.gridItem.item.command;
      if (!this.gridItem.item.media_player_id)
      {
        this.gridItem.item.media_player_id = "";
        this.commandEditor?.initSelection();
      }
    }
    this.cdr.detectChanges();
  }

  executeCommand(command: string | Command) {
    if (!this.remote || typeof command === 'string') return;
    let execCommand = {...command};
    if (this.activity?.entity_type !== 'activity')
    {
      const internalCommand = this.configEntityCommands?.find(item => item.id === command.cmd_id);
      if (!internalCommand)
      {
        //TODO why is it not possible to get the "default" cmd_id from entity type ?
        if (this.activity?.options?.kind === 'IR')
          execCommand = {entity_id: this.activity!.entity_id!, cmd_id: "remote.send", params: {...command}};
        else
          execCommand = {entity_id: this.activity!.entity_id!, cmd_id: "remote.send_cmd", params: {command: command.cmd_id}};
      }
    }
    this.server.executeRemotetCommand(this.remote, execCommand).subscribe(results => {
      // this.messageService.add({key: "remoteCommand", summary: "Command executed",
      //   severity: "success", detail: `Results : ${results.code} : ${results.message}`});
    });
    this.cdr.detectChanges();
  }
}
