import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewEncapsulation} from '@angular/core';
import {MessageService} from "primeng/api";
import {ServerService} from "../../server.service";
import {Activity, CommandSequence, Entity, Remote, RemoteMap} from "../../interfaces";
import {CommandEditorComponent} from "../command-editor/command-editor.component";
import {NgIf} from "@angular/common";
import {OrderListModule} from "primeng/orderlist";
import {IconComponent} from "../../icon/icon.component";
import {ToastModule} from "primeng/toast";
import {DragDropModule} from "primeng/dragdrop";

@Component({
  selector: 'app-activity-sequence',
  standalone: true,
  imports: [
    CommandEditorComponent,
    OrderListModule,
    IconComponent,
    ToastModule,
    NgIf
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
    this.messageService.add({
      key: "sequence",
      severity: "info", summary: `Not implemented yet editing command ${commandSequence?.command?.cmd_id}`,
    });
    this.cdr.detectChanges();
  }
}
