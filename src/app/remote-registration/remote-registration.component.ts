import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Output} from '@angular/core';
import {DialogModule} from "primeng/dialog";
import {MessageService} from "primeng/api";
import {ServerService} from "../server.service";
import {ToastModule} from "primeng/toast";
import {FormsModule} from "@angular/forms";
import {ButtonModule} from "primeng/button";
import {Remote} from "../interfaces";
import {NgIf} from "@angular/common";
import {TableModule} from "primeng/table";
import {TooltipModule} from "primeng/tooltip";

@Component({
  selector: 'app-remote-registration',
  standalone: true,
  imports: [
    DialogModule,
    ToastModule,
    FormsModule,
    ButtonModule,
    NgIf,
    TableModule,
    TooltipModule
  ],
  templateUrl: './remote-registration.component.html',
  styleUrl: './remote-registration.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RemoteRegistrationComponent {
  visible = false;
  host = "";
  port = "8080";
  username = 'web-configurator';
  token = "1234";
  remotes: Remote[] = [];
  @Output() remoteSelected = new EventEmitter<Remote>();
  selectedRemote: Remote | undefined;

  constructor(private server: ServerService, private cdr: ChangeDetectorRef, private messageService: MessageService) {
  }

  showDialog()
  {
    this.server.getConfig().subscribe(config => {
      this.remotes = config.remotes ? config.remotes : [];
      this.cdr.detectChanges();
    })
    this.visible = true;
    this.cdr.detectChanges();
  }

  submit() {
    this.server.registerRemote({
      name: this.server.API_KEY_NAME,
      address: this.host,
      port: this.port,
      user: this.username,
      token: this.token
    }).subscribe({next: ((results) => {

        this.messageService.add({severity: "success", summary: "Remote registered",
          detail: `Key ${results.api_key} valid to ${results.api_valid_to}`,
          key: "remote"});
        this.cdr.detectChanges();
    }),
      error: ((error: any) => {
        console.error("Error registering remote", error);
        this.messageService.add({severity: "error", summary: "Error while registering remote", key: "remote"});
        this.cdr.detectChanges();
    })})
  }

  selectRemote(remote: Remote) {
    this.selectedRemote = remote;
    this.remoteSelected.emit(remote);
    this.visible = false;
    this.cdr.detectChanges();
  }
}
