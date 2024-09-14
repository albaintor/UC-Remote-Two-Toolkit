import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit, ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {ConfirmationService, MenuItem, MessageService, SharedModule} from "primeng/api";
import {ServerService} from "../server.service";
import {Config, Driver, Entity, Integration, Remote, RemoteStatus} from "../interfaces";
import {
  finalize,
  forkJoin,
  map,
  mergeMap,
  Observable, of,
  Subscription,
  takeWhile, timer
} from "rxjs";
import {Helper} from "../helper";
import {DropdownModule} from "primeng/dropdown";
import {MenubarModule} from "primeng/menubar";
import {DecimalPipe, NgForOf, NgIf} from "@angular/common";
import {ProgressSpinnerModule} from "primeng/progressspinner";
import {ToastModule} from "primeng/toast";
import {FormsModule} from "@angular/forms";
import {MessagesModule} from "primeng/messages";
import {TableModule} from "primeng/table";
import {ChipModule} from "primeng/chip";
import {
  FileBeforeUploadEvent,
  FileUpload,
  FileUploadErrorEvent,
  FileUploadEvent,
  FileUploadModule
} from "primeng/fileupload";
import {BlockUIModule} from "primeng/blockui";
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {InputTextModule} from "primeng/inputtext";
import {MultiSelectModule} from "primeng/multiselect";

type DriverIntegration = Driver | Integration;

interface IntegrationsDrivers {
  drivers?: Driver[];
  integrations?: Integration[];
}

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
    FileUploadModule,
    DecimalPipe,
    BlockUIModule,
    ConfirmDialogModule,
    InputTextModule,
    MultiSelectModule,
    NgForOf
  ],
  templateUrl: './integrations.component.html',
  styleUrl: './integrations.component.css',
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class IntegrationsComponent implements OnInit, OnDestroy {
  menuItems: MenuItem[] = [
    {label: 'Home', routerLink: '/home', icon: 'pi pi-home'},
  ]
  config: Config | undefined;
  remotes: Remote[] | undefined;
  selectedRemote: Remote | undefined;
  progress = false;
  integrations: Integration[] = [];
  drivers: Driver[] = [];
  driverIntegrations: DriverIntegration[] = [];
  remoteStatus: RemoteStatus | undefined;
  updateTask: Subscription | undefined;
  entities: Entity[] | undefined;
  @ViewChild(FileUpload) fileUpload: FileUpload | undefined;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService,
              private confirmationService: ConfirmationService) {}


  ngOnInit(): void {
    this.server.getConfig().subscribe(config => {
      this.updateRemote(config);
      this.startUpdateTask();
      this.server.config$.subscribe(config => {
        this.updateRemote(config);
        // this.startUpdateTask();
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
    this.startUpdateTask();
  }

  startUpdateTask()
  {
    if (this.updateTask)
    {
      this.updateTask.unsubscribe();
      this.updateTask = undefined;
    }
    this.updateTask = this.getRemoteStatus()?.subscribe();
  }

  updateIntegrations(): Observable<IntegrationsDrivers>
  {
    if (!this.selectedRemote) return of({});

    const tasks: Observable<IntegrationsDrivers>[] = [];
    tasks.push(this.server.getRemoteIntegrations(this.selectedRemote).pipe(map(integrations => {
      this.integrations = integrations;
      console.log("Integrations", integrations);
      this.integrations.forEach(integration => (integration.name as any) = Helper.getEntityName(integration))
      // this.messageService.add({severity: "success", summary: `Remote data ${this.selectedRemote?.address}`,
      //   detail: `${this.entity_list.length} entities extracted`});
      this.cdr.detectChanges();
      return { integrations };
    })));

    tasks.push(this.server.getRemoteDrivers(this.selectedRemote).pipe(map(drivers => {
      this.drivers = drivers;
      console.log("Drivers", drivers);
      this.drivers.forEach(driver => (driver.name as any) = Helper.getEntityName(driver))
      this.cdr.detectChanges();
      return { drivers };
    })));

    return forkJoin(tasks).pipe(map(results => {
      const data: IntegrationsDrivers = {drivers: [], integrations: []};

      for (let result of results) {
        if (result.drivers) data.drivers?.push(...result.drivers);
        if (result.integrations) data.integrations?.push(...result.integrations);
      }
      return data;
    }));
  }


  loadRemoteData():void
  {
    if (!this.selectedRemote)
    {
      this.messageService.add({key: "integrationComponent", severity:'error', summary:'No remote selected'});
      this.cdr.detectChanges();
      return;
    }
    this.progress = true;
    this.cdr.detectChanges();
    this.updateIntegrations().subscribe(({next: (results) => {
      if (!results.drivers && !results.integrations) return;
        //this.driverIntegrations = [...this.integrations, ...this.drivers];
        this.driverIntegrations = [...this.drivers];
        this.messageService.add({key: "integrationComponent",
          severity: "success", summary: "Remote drivers and integrations loaded",
        });
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.messageService.add({key: "integrationComponent",
          severity: "error", summary: "Error during remote extraction"
        });
        this.progress = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        // this.items.filter(item => (item as any).block == true).forEach(item => item.disabled = false);
        this.progress = false;
        this.cdr.detectChanges();
      }}));
  }


  protected readonly Helper = Helper;

  onUploadIntegration($event: FileUploadEvent, integrationUpload: FileUpload) {
    console.log("Integration uploaded", $event);
    this.messageService.add({key: "integrationComponent", severity: "info", summary: `Driver uploaded to the remote ${this.selectedRemote?.remote_name}`});
    this.progress = false;
    integrationUpload.clear();
    this.loadRemoteData();
    this.cdr.detectChanges();
  }

  onUploadingIntegration($event: FileBeforeUploadEvent) {
    console.log("Integration uploading", $event);
    this.messageService.add({key: "integrationComponent", severity: "info", summary: `Please wait while integration is uploading...`});
    this.progress = true;
    this.cdr.detectChanges();
  }

  deleteDriver(integration: Driver | Integration) {
    if (!this.selectedRemote) return;

    const name = Helper.getEntityName(integration);
    const remote = this.selectedRemote;

    this.confirmationService.confirm({key: "confirmIntegrations",
      header: `Do you really want to remove driver & integrations of "${name}" ?`,
      acceptIcon: 'pi pi-check mr-2',
      rejectIcon: 'pi pi-times mr-2',
      rejectButtonStyleClass: 'p-button-sm',
      acceptButtonStyleClass: 'p-button-outlined p-button-sm',
      reject: () => {
        this.cdr.detectChanges();
      },
      accept: () => {
        if ((integration as Integration).integration_id && (integration as Integration).integration_id.length > 0)
        {
          this.server.deleteRemoteIntegration(remote, (integration as Integration).integration_id).subscribe(
            {next: results => {
                this.messageService.add({key: "integrationComponent", severity: "success", summary: `Integration ${integration.name} successfully deleted`});
                console.debug("Deleted integration", integration, results);
                this.loadRemoteData();
                this.cdr.detectChanges();
              },
              error: (error) => {
                this.messageService.add({key: "integrationComponent", severity: "warn", summary: `An error may have occurred during deletion of integration ${integration.name}`});
                console.error("Error while deleting integration", error);
                this.loadRemoteData();
                this.cdr.detectChanges();
              }});
        }
        else
        {
          this.server.deleteRemoteDriver(remote, (integration as Driver).driver_id).subscribe(
            {next: results => {
                this.messageService.add({key: "integrationComponent", severity: "success", summary: `Driver ${integration.name} successfully deleted`});
                console.debug("Deleted driver", integration, results);
                this.loadRemoteData();
                this.cdr.detectChanges();
              },
              error: (error) => {
                this.messageService.add({key: "integrationComponent", severity: "warn", summary: `An error may have occurred during deletion during deletion of driver ${integration.name}`});
                this.loadRemoteData();
                console.error("Error while deleting driver", error);
                this.cdr.detectChanges();
              }});
        }
      }
    });
  }

  getRemoteStatus(): Observable<RemoteStatus | undefined> | undefined
  {
    if (!this.selectedRemote) return undefined;
    const remote = this.selectedRemote;
    interface RemoteData {
      remoteStatus?: RemoteStatus;
      integrationDrivers?: IntegrationsDrivers;
    }
    const tasks: Observable<RemoteData>[] = [
      of(true).pipe(mergeMap(value => {
        if (!this.selectedRemote) return of({} as RemoteData);
        return this.server.getRemoteStatus(this.selectedRemote).pipe(map(results => {
          return {remoteStatus: results};
        }))
      })),
      this.updateIntegrations().pipe(map(results => {
        return {integrationDrivers: results};
      }))
    ];

    return timer(0, 5000).pipe(mergeMap(() =>
        forkJoin(tasks).pipe(map(results => {
          let remoteStatus: RemoteStatus | undefined = undefined
          for (let result of results)
          {
            if (result.remoteStatus) remoteStatus = result.remoteStatus;
            if (result.integrationDrivers) {
              if (result.integrationDrivers.integrations)
                this.integrations = result.integrationDrivers.integrations;
              if (result.integrationDrivers.drivers)
                this.drivers = result.integrationDrivers.drivers;
              this.driverIntegrations = [...this.drivers];
              this.cdr.detectChanges();
            }
          }
          return remoteStatus;
      }),
      takeWhile(results => {
        console.debug("Updated remote status", results);
        if (results) this.remoteStatus = results;
        this.cdr.detectChanges();
        return this.selectedRemote != undefined
      }),
      finalize(()=>console.log("Finished update status")))));

    // return timer(0, 5000).pipe(mergeMap(() => {
    //  if (!this.selectedRemote) return of({} as RemoteStatus);
    //  return this.server.getRemoteStatus(this.selectedRemote)
    //  }),
    //    takeWhile(results=> {
    //      console.debug("Updated remote status", results);
    //      if (results) this.remoteStatus = results;
    //      this.cdr.detectChanges();
    //      return this.selectedRemote != undefined
    //    }),
    //    finalize(()=>console.log("Finished update status")))
  }

  protected readonly Math = Math;

  ngOnDestroy(): void {
    this.selectedRemote = undefined;
    if (this.updateTask)
    {
      this.updateTask.unsubscribe();
      this.updateTask = undefined;
    }
  }

  onUploadIntegrationError($event: FileUploadErrorEvent) {
    console.log("Integration upload failed", $event);
    this.messageService.add({key: "integrationComponent", severity: "error", summary: `Failed to upload diver to the remote ${this.selectedRemote?.remote_name}. The filename should not have any special characters (parenthesis...)`,
      detail: $event.error?.error.body, sticky: true});
    this.progress = false;
    this.fileUpload?.clear();
    this.cdr.detectChanges();
  }

  getIntegrationEntities(integrationDriver: Driver | Integration) {
    if (!this.selectedRemote) return;
    const driverId = integrationDriver.driver_id;
    const integration = this.integrations.find(integration => integration.driver_id === driverId);
    if (!integration) return;
    this.server.getRemoteIntegrationEntities(this.selectedRemote, integration.integration_id, "ALL").subscribe(entities => {
      console.debug("Entities for integration", integrationDriver, entities);
      this.entities = entities;
      this.cdr.detectChanges();
    })
  }
}
