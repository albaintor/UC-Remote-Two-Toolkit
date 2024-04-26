import {ChangeDetectionStrategy, ChangeDetectorRef, Component} from '@angular/core';
import {ServerService} from "../../server.service";
import {MessageService} from "primeng/api";
import {RemoteMap} from "../../interfaces";

@Component({
  selector: 'app-command-editor',
  standalone: true,
  imports: [],
  templateUrl: './command-editor.component.html',
  styleUrl: './command-editor.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommandEditorComponent {
  templates: RemoteMap[] | undefined;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
    this.server.getTemplateRemoteMap().subscribe(templates => {
      this.templates = templates;
      this.cdr.detectChanges();
    })
  }
}
