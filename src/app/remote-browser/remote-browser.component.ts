import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {ActivityViewerComponent} from "../activity-viewer/activity-viewer.component";
import {AutoCompleteCompleteEvent, AutoCompleteModule} from "primeng/autocomplete";
import {ButtonModule} from "primeng/button";
import {ChipModule} from "primeng/chip";
import {CommonModule} from "@angular/common";
import {NgxJsonViewerModule} from "ngx-json-viewer";
import {OverlayPanelModule} from "primeng/overlaypanel";
import {ProgressBarModule} from "primeng/progressbar";
import {RemoteRegistrationComponent} from "../remote-registration/remote-registration.component";
import {ConfirmationService, MenuItem, MessageService} from "primeng/api";
import {TableModule} from "primeng/table";
import {UploadedFilesComponent} from "../uploaded-files/uploaded-files.component";
import {
  Activity, ActivityEntityUsage,
  Config,
  Context,
  Entity,
  EntityCommand,
  EntityUsage,
  OrphanEntity,
  Profile,
  Remote, RemoteData
} from "../interfaces";
import {ServerService} from "../server.service";
import {catchError, forkJoin, from, map, mergeMap, of} from "rxjs";
import {FormsModule} from "@angular/forms";
import {InputTextModule} from "primeng/inputtext";
import {TooltipModule} from "primeng/tooltip";
import {MenubarModule} from "primeng/menubar";
import {ToastModule} from "primeng/toast";
import {DropdownModule} from "primeng/dropdown";
import {ProgressSpinnerModule} from "primeng/progressspinner";
import {Helper} from "../helper";
import {EntityViewerComponent} from "./entity-viewer/entity-viewer.component";
import {MessagesModule} from "primeng/messages";
import {DialogModule} from "primeng/dialog";
import {MultiSelectModule} from "primeng/multiselect";
import {AccordionModule} from "primeng/accordion";
import {RemoteDataLoaderComponent} from "../remote-data-loader/remote-data-loader.component";
import {BlockUIModule} from "primeng/blockui";
import { saveAs } from 'file-saver-es';
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {IconComponent} from "../controls/icon/icon.component";
import {RemoteWidgetComponent} from "../remote-widget/remote-widget.component";

interface FileProgress
{
  data: File;
  inProgress: boolean;
  progress : number;
}

@Component({
  selector: 'app-remote-browser',
  standalone: true,
  imports: [
    TableModule,
    CommonModule,
    ChipModule,
    OverlayPanelModule,
    AutoCompleteModule,
    FormsModule,
    NgxJsonViewerModule,
    InputTextModule,
    ButtonModule,
    TooltipModule,
    MenubarModule,
    ToastModule,
    ProgressBarModule,
    UploadedFilesComponent,
    RemoteRegistrationComponent,
    DropdownModule,
    ProgressSpinnerModule,
    ActivityViewerComponent,
    EntityViewerComponent,
    MessagesModule,
    DialogModule,
    MultiSelectModule,
    AccordionModule,
    RemoteDataLoaderComponent,
    BlockUIModule,
    ConfirmDialogModule,
    IconComponent,
    RemoteWidgetComponent
  ],
  templateUrl: './remote-browser.component.html',
  styleUrl: './remote-browser.component.css',
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class RemoteBrowserComponent implements AfterViewInit {
  @ViewChild("fileUpload", {static: false}) fileUpload: ElementRef | undefined;
  @ViewChild(UploadedFilesComponent) uploadedFilesComponent: UploadedFilesComponent | undefined;
  @ViewChild(RemoteRegistrationComponent) remoteComponent: RemoteRegistrationComponent | undefined;
  @ViewChild(RemoteDataLoaderComponent) remoteLoader: RemoteDataLoaderComponent | undefined;

  activities: Activity[] = [];
  entities: Entity[] = [];
  entity: Entity | undefined;
  suggestions: Entity[] = [];
  hoverEntity: Entity | undefined;
  outputObject: any = null;
  profiles: Profile[] = [];
  currentFile: FileProgress | undefined;
  context: Context | undefined;
  config: Config | undefined;
  remotes: Remote[] = [];
  selectedRemote: Remote | undefined;
  progress = false;
  blockedMenu = false;
  protected readonly Math = Math;
  items: MenuItem[] = [
    {label: 'Remotes', command: () => this.selectRemote(), icon: 'pi pi-mobile'},
    {label: 'Integrations', routerLink:'/integrations', icon: 'pi pi-microchip'},
    {label: 'Load', icon: 'pi pi-cloud-download',
      items: [
        {label: 'Load Remote data', command: () => this.loadRemote(), icon: 'pi pi-cloud-download', block: true},
        {label: 'Load Remote resources', command: () => this.loadRemoteResources(), icon: 'pi pi-images', block: true},
      ],
      block: true},
    {label: 'Replace entities', routerLink:'/entity/rename', icon: 'pi pi-file-edit'},
    {label: 'Activity', icon: 'pi pi-file-import', items: [
        {label: 'Import activity from file', routerLink:'/activity/edit', queryParams: {'source': 'file'}, icon: 'pi pi-file-import'},
        {label: 'Import activity from clipboard', routerLink:'/activity/edit', queryParams: {'source': 'clipboard'}, icon: 'pi pi-clipboard'},
      ]
    },
    {label: 'Backup & restore', icon: 'pi pi-save', items: [
        {label: 'Backup this remote',  command: () => this.saveRemote(), icon: 'pi pi pi-save'},
        {label: 'Restore backup to this remote', command: () => this.restoreRemote(), icon: 'pi pi-upload'},
      ]
    },
    {label: 'Synchronize', routerLink:'/activities/sync', icon: 'pi pi-sync'},
    {label: 'Edit pages', routerLink:'/pages/edit', icon: 'pi pi-pen-to-square'},
    {label: 'Play Remote', routerLink:'/play', icon: 'pi pi-play'},
  ]
  entityUsages: EntityUsage | null | undefined;
  localMode = true;
  configCommands: EntityCommand[] = [];
  viewerVisible = false;
  orphanEntities: OrphanEntity[] = [];
  unusedEntities: Entity[] = [];
  selectedUnusedEntities: Entity[] = [];
  remoteProgress = 0;
  progressDetail = "";
  accordionActiveIndexes = [2, 3];

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService,
              private confirmationService: ConfirmationService) {
    this.server.getConfig().subscribe(config => {});
  }

  ngAfterViewInit(): void {
    this.server.config$.subscribe(config => {
      console.log("Updated config", config);
      if (config) this.updateRemote(config);
    })
    const data = localStorage.getItem("remoteData");
    if (data) {
      const remoteData: RemoteData = JSON.parse(data);
      if (remoteData.activities) this.activities = remoteData.activities;
      if (remoteData.entities) this.entities = remoteData.entities;
      if (remoteData.profiles) this.profiles = remoteData.profiles;
      if (remoteData.context) this.context = remoteData.context;
      if (remoteData.configCommands) this.configCommands = remoteData.configCommands;
      if (!this.checkCache())
      {
        this.clearCache();
        return;
      }
      this.server.setEntities(this.entities);
      this.server.setActivities(this.activities);
      this.server.setProfiles(this.profiles);
      this.unusedEntities = Helper.getUnusedEntities(this.activities, this.profiles, this.entities);
      this.orphanEntities = Helper.getOrphans(this.activities, this.entities);
      // this.server.setContext(this.context);
      this.messageService.add({severity: "info", summary: `Remote data loaded from cache`});
      this.localMode = true;
      let offset = 0;
      if (this.unusedEntities.length > 0) offset ++;
      if (this.orphanEntities.length > 0) offset ++;
      this.accordionActiveIndexes = [offset, offset+1];
      this.cdr.detectChanges();
    }
    else
      this.init();
  }

  checkCache(): boolean
  {
    if (!this.selectedRemote || !this.context) return true;
    if (this.context.remote_ip && this.context.remote_ip !== this.selectedRemote.address)
      return false;
    return true;
  }

  clearCache()
  {
    localStorage.removeItem("remoteData");
    this.entities = [];
    this.activities = [];
    this.profiles = [];
    this.context = undefined;
    this.configCommands = [];
    this.orphanEntities = [];
    this.unusedEntities = [];
    this.cdr.detectChanges();
  }

  init(): void {
    this.localMode = false;
  }

  loadRemote()
  {
    if (!this.remoteLoader) return;
    this.blockedMenu = true;
    this.progress = true;
    this.cdr.detectChanges();
    this.remoteLoader.loadRemoteData().subscribe({next: value => {
        this.blockedMenu = false;
        this.progress = false;
        this.cdr.detectChanges();
      }, error: error => {
        console.error("Error during remote extraction", error);
        this.blockedMenu = false;
        this.progress = false;
        this.messageService.add({severity:'error', summary:'Error during remote extraction'});
        this.cdr.detectChanges();
      }});
  }

  updateRemote(config: Config): void
  {
    this.config = config;
    this.remotes = config.remotes!;
    this.selectedRemote  = Helper.getSelectedRemote(this.remotes);
    if (this.selectedRemote) this.server.remote$.next(this.selectedRemote);
    this.cdr.detectChanges();
  }

  setRemote(remote: Remote): void
  {
    this.selectedRemote = remote;
    Helper.setRemote(remote);
    this.server.remote$.next(remote);
    this.cdr.detectChanges();
    if (!this.context || this.context.remote_ip !== `${remote.address}:${remote.port}`)
      this.remoteLoader?.load();
  }

  selectRemote(): void
  {
    this.remoteComponent!.showDialog();
    this.cdr.detectChanges();
  }

  showEntity(entityId: string)
  {
    this.hoverEntity = this.entities.find(entity => entity.entity_id === entityId);
  }

  getEntityName(entityId: string): string
  {
    const entity = this.entities.find(entity => entity.entity_id === entityId);
    if (entity?.name)
      return Helper.getEntityName(entity)!;
    return `Unknown ${entityId}`;
  }

  selectEntity(entity: Entity | string | undefined) {
    if (!entity) return;
    if (typeof entity === 'string') {
      const entityId = (entity as any) as string;
      this.entity = this.entities.find(entity => entity.entity_id === entityId);
    }
    else
      this.entity = entity as Entity;
    if (!this.entity) return;
    this.entityUsages = Helper.fingEntityUsage(this.entity.entity_id!, this.entities, this.activities, this.profiles);
    console.log("Usage of entity", this.entity, this.entityUsages);
    this.cdr.detectChanges();
  }

  searchEntity($event: AutoCompleteCompleteEvent) {
    if (!$event.query || $event.query.length == 0)
    {
      console.log("Search entity : whole list");
      this.suggestions = [...this.entities.sort((a, b) => {
        return (a.name ? Helper.getEntityName(a)! : "").localeCompare(b.name ? Helper.getEntityName(b)! : "");
      })];
      this.cdr.detectChanges();
      return;
    }
    if (this.localMode)
    {
      this.suggestions = Helper.queryEntity($event.query, this.entities);
      this.cdr.detectChanges();
      return;
    }
    this.server.findEntities($event.query).subscribe(results => {
      this.suggestions = Helper.queryEntity($event.query, results);
      this.cdr.detectChanges();
    })
  }

  getStyle(value: string): any
  {
    try {
      const color = this.getBackgroundColor(value);
      return {"background-color" : color};
    } catch (exception)
    {
      return ""
    }
  }

  getBackgroundColor(stringInput: string) {
    if (stringInput.toLowerCase().startsWith('unknown')) return 'red';
    let stringUniqueHash = [...stringInput].reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return `hsl(${stringUniqueHash % 360}, 95%, 40%)`;
  }

  removeEntities(entities: Entity[])
  {
    if (!this.selectedRemote) return;
    const remote = this.selectedRemote;
    this.progress = true;
    const total = entities.length;
    this.remoteProgress = 0;
    let errors = 0;
    this.cdr.detectChanges();
    const tasks = from(entities).pipe(mergeMap(entity => {
      this.remoteProgress += 100/total;
      let entityName = Helper.getEntityName(entity);
      if (!entityName) entityName = entity.entity_id!;
      this.progressDetail = `Removing ${entityName}`;
      if (errors > 0) this.progressDetail += ` (${errors} errors)`
      this.progressDetail += "...";
      this.cdr.detectChanges();
      return this.server.deleteRemoteEntity(remote, entity.entity_id!).pipe(
        catchError(error => {
          console.error("Error activity", error);
          errors++;
          this.cdr.detectChanges();
          return of(entity);
        }),
        map(
        results => {
          return entity;
      }))
    },1))

    forkJoin([tasks]).subscribe(results => {
      if (errors > 0)
        this.messageService.add({severity: 'warning', summary: `${errors} errors during the deletion on ${entities.length} entities`,
          sticky: true});
      else
        this.messageService.add({severity: 'success', summary: `${entities.length} entities removed`, sticky: true});
      this.progress = false;
      this.remoteProgress = 0;
      this.cdr.detectChanges();
    })
  }

  updateConfiguration() {
    this.init();
  }

  downloadFileResponse(response: Response, filename: string) {
    let dataType = response.type;
    let binaryData = [];
    binaryData.push(response);
    let downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(new Blob(binaryData as any, {type: dataType}));
    if (filename)
      downloadLink.setAttribute('download', filename);
    document.body.appendChild(downloadLink);
    downloadLink.click();
  }

  downloadFile(url: string)
  {
    this.server.getBackup(url).subscribe(results => {
      console.debug("Download backup", results);
      this.downloadFileResponse(results, url);
    })
  }

  copyToClipboard(data: any) {
    navigator.clipboard.writeText(JSON.stringify(data)).then(r => {
      this.messageService.add({severity:'info', summary: "Data copied to clipboard"});
      this.cdr.detectChanges();
    });
  }

  private loadRemoteResources() {
    if (!this.selectedRemote)
    {
      this.messageService.add({severity:'error', summary:'No remote selected'});
      this.cdr.detectChanges();
      return;
    }
    this.blockedMenu = true;
    this.progress = true;
    this.cdr.detectChanges();
    this.server.loadResources(this.selectedRemote, "Icon").subscribe({next: results => {
        this.messageService.add({severity: "success", summary: `Remote resources ${this.selectedRemote?.address} extracted successfully`});
        this.progress = false;
        this.blockedMenu = false;
        this.cdr.detectChanges();
      }, error: err => {
      console.error(err);
        this.messageService.add({severity: "error", summary: `Remote resources ${this.selectedRemote?.address} extraction failed`});
        this.cdr.detectChanges();
      },
      complete: () => {
      this.progress = false;
      this.blockedMenu = false;
      this.cdr.detectChanges();
      }
    })
  }

  viewActivity(activityeditor: ActivityViewerComponent, activity: Activity | ActivityEntityUsage)
  {
    if ((activity as ActivityEntityUsage).activity_id && this.activities)
      activityeditor.view(this.activities!
        .find(item => item.entity_id === (activity as ActivityEntityUsage).activity_id)!, false);
    else
      activityeditor.view(activity, false);
    this.viewerVisible = true;
    this.cdr.detectChanges();
  }

  protected readonly Helper = Helper;

  setFilter(dt: any, $event: Event) {
    dt.filterGlobal(($event as any).target.value, 'contains')
  }

  updateRemotes($event: Remote[]) {
    this.remotes = $event;
    this.cdr.detectChanges();
  }

  remoteLoaded($event: RemoteData | undefined) {
    if ($event)
    {
      this.activities = $event.activities;
      this.orphanEntities = $event.orphanEntities;
      this.entities = $event.entities;
      this.unusedEntities = $event.unusedEntities;
      this.profiles = $event.profiles;
      this.configCommands = $event.configCommands;
      this.context = $event.context;
      this.activities.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.entities.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.profiles.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.unusedEntities.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.orphanEntities.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.cdr.detectChanges();
    }
  }

  removeEntity(entity: Entity) {
    if (!this.selectedRemote || !entity?.entity_id) return;
    this.server.deleteRemoteEntity(this.selectedRemote, entity.entity_id).subscribe({next: results => {
        this.unusedEntities.splice(this.unusedEntities.indexOf(entity), 1);
        this.unusedEntities = [...this.unusedEntities];
        this.messageService.add({severity: "success", summary: `Entity ${Helper.getEntityName(entity)} (${entity.entity_id}) removed successfully`});
        this.cdr.detectChanges();
      }, error: err => {
        console.error(err);
        this.messageService.add({severity: "error", summary: `Error while removing entity ${Helper.getEntityName(entity)} (${entity.entity_id})`});
        this.cdr.detectChanges();
      }
    })
  }

  private saveRemote() {
    if (!this.selectedRemote) return;
    return this.server.getRemoteBackup(this.selectedRemote).subscribe(blob => {
      saveAs(blob, "backup.zip");
    });
  }

  private restoreRemote() {
    return undefined;
  }

  setLanguage(languageCode: string) {
    if (!this.config) return;
    this.config.language = languageCode;
    this.server.setConfig(this.config).subscribe({next: results => {
        this.messageService.add({severity: "success", summary: `Language changed to "${languageCode}" and saved`});
        this.cdr.detectChanges();
      }});
  }
}
