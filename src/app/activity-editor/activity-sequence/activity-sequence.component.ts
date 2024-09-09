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
import {Activity, CommandSequence, Entity, Remote, RemoteMap} from "../../interfaces";
import {CommandEditorComponent} from "../command-editor/command-editor.component";
import {NgIf} from "@angular/common";
import {OrderListModule} from "primeng/orderlist";
import {IconComponent} from "../../icon/icon.component";
import {ToastModule} from "primeng/toast";
import {Button} from "primeng/button";
import {DialogModule} from "primeng/dialog";
import {DockModule} from "primeng/dock";

@Component({
  selector: 'app-activity-sequence',
  standalone: true,
  imports: [
    CommandEditorComponent,
    OrderListModule,
    IconComponent,
    ToastModule,
    NgIf,
    Button,
    DialogModule,
    DockModule
  ],
  templateUrl: './activity-sequence.component.html',
  styleUrl: './activity-sequence.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ActivitySequenceComponent {
  @Input() remote: Remote | undefined;
  @Input() activity: Activity | undefined;
  @Input() sequenceName: string | undefined;
  @Input() editable = true;
  @Output() onUpdate = new EventEmitter<{activity:Activity, sequenceName:string}>();
  selectedCommandSequence: CommandSequence | undefined;
  commandVisible = false;

  templates: RemoteMap[] = [];
  entities: Entity[] | undefined;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
    this.server.getTemplateRemoteMap().subscribe(templates => {
      this.templates = templates;
      this.cdr.detectChanges();
    });
    this.server.entities$.subscribe(entities => {
      this.entities = entities;
    })
  }

  getCommandEntity(commandSequence: CommandSequence): Entity | undefined
  {
    return this.entities?.find(entity => commandSequence.command?.entity_id === entity.entity_id);

  }

  getCommandParams(commandSequence: CommandSequence): string
  {
    if (!commandSequence?.command?.params) return "";
    let params: {[type: string]: any} = commandSequence.command.params;
    const list: string[] = [];
    for (let param in params)
    {
      list.push(`${param} : ${params[param].toString()}`)
    }
    return list.join(", ");
  }

  editCommand(commandSequence: CommandSequence) {
    if (!commandSequence) return;
    this.selectedCommandSequence = commandSequence;
    this.commandVisible = true;
    this.cdr.detectChanges();
  }

  updateSequence($event: any) {
    if (!this.activity || !this.sequenceName) return;
    this.onUpdate.emit({activity: this.activity, sequenceName: this.sequenceName});
  }

  deleteCommand(commandSequence: CommandSequence) {
    if (!this.sequenceName) return;
    const index = this.activity?.options?.sequences?.[this.sequenceName]?.indexOf(commandSequence);
    if (index && index != -1) {
      this.activity?.options?.sequences?.[this.sequenceName]?.splice(index, 1);
      this.updateSequence(null);
      this.cdr.detectChanges();
    }
  }

  addCommand($event: MouseEvent) {
    if (!this.sequenceName) return;
    const sequences = this.activity?.options?.sequences?.[this.sequenceName];
    let entity_id = "";
    if (sequences && sequences?.length > 0 && sequences[0].command?.entity_id) entity_id = sequences[0].command.entity_id;
    this.activity?.options?.sequences?.[this.sequenceName]?.push({type: "command", command: {entity_id, cmd_id: ""}});
    const sequenceName = this.sequenceName;
    this.sequenceName = undefined;
    this.cdr.detectChanges();
    this.sequenceName = sequenceName;
    this.cdr.detectChanges();
  }
}
