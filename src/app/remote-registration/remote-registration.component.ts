import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Output} from '@angular/core';
import {DialogModule} from "primeng/dialog";
import {MessageService} from "primeng/api";
import {ServerService} from "../server.service";
import {ToastModule} from "primeng/toast";
import {FormsModule} from "@angular/forms";
import {ButtonModule} from "primeng/button";
import {Remote, RemoteRegistration} from "../interfaces";
import {NgIf} from "@angular/common";
import {TableModule} from "primeng/table";
import {TooltipModule} from "primeng/tooltip";
import {InputTextModule} from "primeng/inputtext";
import {BlockUIModule} from "primeng/blockui";
import {ProgressSpinnerModule} from "primeng/progressspinner";
import {WebsocketService} from "../websocket/websocket.service";

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
    TooltipModule,
    InputTextModule,
    BlockUIModule,
    ProgressSpinnerModule
  ],
  templateUrl: './remote-registration.component.html',
  styleUrl: './remote-registration.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RemoteRegistrationComponent {
  visible = false;
  host = "";
  port = "80";
  username = 'web-configurator';
  token = "1234";
  remotes: Remote[] = [];
  @Output() remoteSelected = new EventEmitter<Remote>();
  @Output() remotesChanged = new EventEmitter<Remote[]>();
  selectedRemote: Remote | undefined;
  registrations: RemoteRegistration[] | undefined;
  blockedPanel = false;
  progress = false;

  constructor(private server: ServerService, private cdr: ChangeDetectorRef, private messageService: MessageService,
              private websocketService: WebsocketService) {
  }

  refresh()
  {
    this.server.getConfig().subscribe(config => {
      console.debug("Remotes extracted", config);
      this.remotes = config.remotes ? config.remotes : [];
      this.cdr.detectChanges();
    })
  }

  showDialog()
  {
    this.refresh();
    this.visible = true;
    this.cdr.detectChanges();
  }

  submit() {
    this.server.registerRemote({
      api_key_name: this.server.API_KEY_NAME,
      address: this.host,
      port: this.port,
      user: this.username,
      token: this.token
    }).subscribe({
      next: ((results) => {
        this.messageService.add({severity: "success", summary: "Remote registered",
          detail: `Key ${results.api_key} valid to ${results.api_valid_to}`,
          key: "remote"});
        this.remotesChanged.emit(this.remotes);
        this.cdr.detectChanges();
    }),
      error: ((error: any) => {
        console.error("Error registering remote", error);
        this.messageService.add({severity: "error", summary: "Error while registering remote", key: "remote"});
        this.cdr.detectChanges();
    }),
      complete: () => {
        this.refresh();
        this.cdr.detectChanges();
      }})
  }

  restartRemote(remote: Remote | undefined)
  {
    if (remote == undefined) return;
    this.server.powerRemote(remote, "REBOOT").subscribe(results => {
      console.debug("Restart remote", results);
      this.messageService.add({severity: "success", summary: "Remote restarted",
        key: "remote"});
      this.cdr.detectChanges();
    });
  }

  selectRemote(remote: Remote) {
    if (remote == undefined) { return; }
    this.selectedRemote = remote;
    this.remoteSelected.emit(remote);
    this.visible = false;
    this.cdr.detectChanges();
  }

  deleteRemote(remote: any) {
    console.info("Unregistering remote", remote);
    this.server.unregisterRemote(remote).subscribe({
      next: ((results) => {
        this.messageService.add({severity: "success", summary: "Remote unregistered",
          key: "remote"});
        this.refresh();
        this.remotesChanged.emit(this.remotes);
        this.cdr.detectChanges();
      }),
      error: ((error: any) => {
        console.error("Error unregistering remote", error);
        this.messageService.add({severity: "error", summary: "Error while unregistering remote", key: "remote"});
        this.remotesChanged.emit(this.remotes);
        this.refresh();
        this.cdr.detectChanges();
      }),
      complete: () => {
        this.refresh();
        this.cdr.detectChanges();
    }})
  }

  getRemote(remote: Remote) {
    this.blockedPanel = true;
    this.progress = true;
    this.cdr.detectChanges();
    this.server.getRemoteRegistrations(remote).subscribe({
      next: ((results) => {
        this.messageService.add({severity: "success", summary: "Registrations retrieved",
          key: "remote"});
        this.registrations = results;
        this.cdr.detectChanges();
      }),
      error: ((error: any) => {
        console.error("Error extracting remote info", error);
        this.blockedPanel = false;
        this.progress = false;
        this.messageService.add({severity: "error", summary: "Error while extracting remote registrations", key: "remote"});
        this.cdr.detectChanges();
      }),
      complete: () => {
        this.blockedPanel = false;
        this.progress = false;
        this.cdr.detectChanges();
      }})
  }

  wakeRemote(remote: Remote) {
    if (!remote) return;
    this.server.wakeRemote(remote).subscribe({next: results => {
        this.messageService.add({severity:'success', summary: "Wake on lan command sent", key: 'remote'});
        this.websocketService.connect();
        this.cdr.detectChanges();
      },
      error: error => {
        this.messageService.add({severity:'error', summary: "Wake on lan command sent", key: 'remote'});
        this.cdr.detectChanges();
      }
    });
    this.server.wakeRemote(remote, "255.255.255.0").subscribe({});
  }

  testRemote(remote: Remote) {
    this.blockedPanel = true;
    this.progress = true;
    this.cdr.detectChanges();
    this.server.getRemoteVersion(remote).subscribe({
      next: ((results) => {
        const data = `Remote ${results.device_name} (${results.hostname} ${results.address}), OS ${results.os}, UI ${results.ui}`;
        console.log("Remote version", results);
        this.messageService.add({severity: "success", summary: "Connection successful", detail: data,
          key: "remote", sticky: true});
        this.cdr.detectChanges();
      }),
      error: ((error: any) => {
        console.error("Error extracting remote info", error);
        this.blockedPanel = false;
        this.progress = false;
        this.messageService.add({severity: "error", summary: "Error while connecting to the remote", key: "remote"});
        this.cdr.detectChanges();
      }),
      complete: () => {
        this.blockedPanel = false;
        this.progress = false;
        this.cdr.detectChanges();
      }})
  }
}
