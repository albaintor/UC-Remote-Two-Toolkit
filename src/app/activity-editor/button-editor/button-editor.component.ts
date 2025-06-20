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
  ButtonMapping, Command, EntityCommand,
  Remote,
} from "../../interfaces";
import {ButtonModule} from "primeng/button";
import {DialogModule} from "primeng/dialog";
import {SelectModule} from "primeng/select";
import {IconSelectorComponent} from "../../controls/icon-selector/icon-selector.component";
import {InputNumberModule} from "primeng/inputnumber";
import {InputTextModule} from "primeng/inputtext";
import {NgIf} from "@angular/common";
import {PaginatorModule} from "primeng/paginator";
import {SelectButtonModule} from "primeng/selectbutton";
import {MessageService, SharedModule} from "primeng/api";
import {ToastModule} from "primeng/toast";
import {ServerService} from "../../server.service";
import {Helper} from "../../helper";
import {CommandEditorComponent} from "../../remote-editor/command-editor/command-editor.component";

export enum ButtonEditionType {
  Create,
  Modify,
  Delete
}

export interface ButtonEditionEvent {
  button: ButtonMapping;
  type: ButtonEditionType;
}

@Component({
    selector: 'app-button-editor',
    imports: [
        ButtonModule,
        DialogModule,
        SelectModule,
        InputNumberModule,
        InputTextModule,
        NgIf,
        PaginatorModule,
        SelectButtonModule,
        SharedModule,
        ToastModule,
        CommandEditorComponent
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
  @Output() buttonChanged = new EventEmitter<ButtonEditionEvent>();
  visible = false;
  backupCommand : ButtonMapping | undefined;
  private configEntityCommands: EntityCommand[] | undefined;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef) {
    this.server.configCommands$.subscribe(config => this.configEntityCommands = config);
  }

  updateCommand() {
    if (this.button)
      this.buttonChanged.emit({button: this.button, type: ButtonEditionType.Modify});
    this.cdr.detectChanges();
  }

  show(): void {
    console.debug("Editing command", this.button);
    if (this.button)
      this.backupCommand = JSON.parse(JSON.stringify(this.button));
    this.visible = true;
    this.cdr.detectChanges();
  }

  undoChanges($event: MouseEvent) {
    if (!this.backupCommand) return;
    this.button = this.backupCommand;
    this.backupCommand = JSON.parse(JSON.stringify(this.button));
    this.buttonChanged.emit({button: this.button, type: ButtonEditionType.Modify});
  }

  deleteCommand()
  {
    delete this.button?.long_press;
    delete this.button?.short_press;
    delete this.button?.double_press;
    this.cdr.detectChanges();
    this.buttonChanged.emit({button: this.button!, type: ButtonEditionType.Delete});
  }

  protected readonly Helper = Helper;

  assignShortPress() {
    this.button!.short_press = {} as any;
    this.cdr.detectChanges();
    this.buttonChanged.emit({button: this.button!, type: ButtonEditionType.Modify});
  }

  assignLongPress() {
    this.button!.long_press = {} as any;
    this.cdr.detectChanges();
    this.buttonChanged.emit({button: this.button!, type: ButtonEditionType.Modify});
  }

  assignDoublePress() {
    this.button!.double_press = {} as any;
    this.cdr.detectChanges();
    this.buttonChanged.emit({button: this.button!, type: ButtonEditionType.Modify});
  }

  removeElement(object: any, element: string) {
    delete object[element];
    this.cdr.detectChanges();
    this.buttonChanged.emit({button: this.button!, type: ButtonEditionType.Modify});
  }

  executeCommand(command: Command) {
    if (!this.remote) return;
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
      // this.messageService.add({key: "remoteButton", summary: "Command executed",
      //   severity: "success", detail: `Results : ${results.code} : ${results.message}`});
    });
    this.cdr.detectChanges();
  }
}
