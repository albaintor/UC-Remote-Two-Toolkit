import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewEncapsulation} from '@angular/core';
import {MenuItem, MessageService, SharedModule} from "primeng/api";
import {ServerService} from "../server.service";
import {Config, Integration, Remote} from "../interfaces";
import {forkJoin, from, map, mergeMap, Observable} from "rxjs";
import {Helper} from "../helper";
import {DropdownModule} from "primeng/dropdown";
import {MenubarModule} from "primeng/menubar";
import {NgIf} from "@angular/common";
import {ProgressSpinnerModule} from "primeng/progressspinner";
import {ToastModule} from "primeng/toast";
import {FormsModule} from "@angular/forms";
import {MessagesModule} from "primeng/messages";
import {TableModule} from "primeng/table";
import {ChipModule} from "primeng/chip";
import {FileBeforeUploadEvent, FileUploadEvent, FileUploadModule} from "primeng/fileupload";

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [
    DropdownModule,
    MenubarModule,
    NgIf,
    ProgressSpinnerModule,
    SharedModule,
    ToastModule,
    FormsModule,
    MessagesModule,
    TableModule,
    ChipModule,
    FileUploadModule
  ],
  templateUrl: './integrations.component.html',
  styleUrl: './integrations.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class IntegrationsComponent implements OnInit {
  menuItems: MenuItem[] = [
    {label: 'Home', routerLink: '/home', icon: 'pi pi-home'},
    {label: 'Load Remote data', command: () => this.loadRemoteData(), icon: 'pi pi-history', block: true},
  ]
  config: Config | undefined;
  remotes: Remote[] | undefined;
  selectedRemote: Remote | undefined;
  progress = false;
  integrations: Integration[] = [];

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {}


  ngOnInit(): void {
    this.server.getConfig().subscribe(config => {
      this.updateRemote(config);
      this.server.config$.subscribe(config => {
        this.updateRemote(config);
      })
    })
  }

  updateRemote(config: Config): void
  {
    this.config = config;
    this.remotes = config.remotes!;
    this.selectedRemote  = Helper.getSelectedRemote(this.remotes);
    this.loadRemoteData();
    this.cdr.detectChanges();
  }

  setRemote(remote: Remote): void
  {
    Helper.setRemote(remote);
    this.server.remote$.next(remote);
    this.loadRemoteData();
  }


  loadRemoteData():void
  {
    if (!this.selectedRemote)
    {
      this.messageService.add({severity:'error', summary:'No remote selected'});
      this.cdr.detectChanges();
      return;
    }
    this.progress = true;
    this.cdr.detectChanges();
    const tasks: Observable<any>[] = [];
    tasks.push(this.server.getRemoteIntegrations(this.selectedRemote).pipe(map(integrations => {
      this.integrations = integrations;
      this.integrations.forEach(integration => (integration.name as any) = Helper.getEntityName(integration))
      // this.messageService.add({severity: "success", summary: `Remote data ${this.selectedRemote?.address}`,
      //   detail: `${this.entity_list.length} entities extracted`});
      this.cdr.detectChanges();
      return integrations;
    })));

    forkJoin(tasks).subscribe({next: (results) => {
        this.messageService.add({
          severity: "success", summary: "Remote integrations loaded",
        });
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.messageService.add({
          severity: "error", summary: "Error during remote extraction"
        });
        this.cdr.detectChanges();
      },
      complete: () => {
        // this.items.filter(item => (item as any).block == true).forEach(item => item.disabled = false);
        this.progress = false;
        this.cdr.detectChanges();
      }})
  }


  protected readonly Helper = Helper;

  onUploadIntegration($event: FileUploadEvent) {
    console.log("Integration uploaded", $event);
    this.messageService.add({severity: "info", summary: `Driver uploaded to the remote ${this.selectedRemote?.remote_name}`});
    this.progress = false;
    this.loadRemoteData();
    this.cdr.detectChanges();
  }

  onUploadingIntegration($event: FileBeforeUploadEvent) {
    console.log("Integration uploading", $event);
    this.progress = true;
    this.cdr.detectChanges();
  }
}
