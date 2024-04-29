import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewChild} from '@angular/core';
import {ServerService} from "../../server.service";
import {MessageService} from "primeng/api";
import {ActivityPageCommand, Remote, RemoteMap} from "../../interfaces";
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
    IconSelectorComponent
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

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
    this.server.getTemplateRemoteMap().subscribe(templates => {
      this.templates = templates;
      this.cdr.detectChanges();
    })
  }

  show(remote: Remote, command: ActivityPageCommand): void {
    this.remote = remote;
    this.command = command;
    this.visible = true;
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
}
