import {ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {ActivityViewerComponent} from "../activity-viewer/activity-viewer.component";
import {AutoCompleteCompleteEvent, AutoCompleteModule} from "primeng/autocomplete";
import {ButtonModule} from "primeng/button";
import {ChipModule} from "primeng/chip";
import {CommonModule, DatePipe, NgForOf, NgIf} from "@angular/common";
import {NgxJsonViewerModule} from "ngx-json-viewer";
import {OverlayPanelModule} from "primeng/overlaypanel";
import {ProgressBarModule} from "primeng/progressbar";
import {RemoteRegistrationComponent} from "../remote-registration/remote-registration.component";
import {MenuItem, MessageService, SharedModule} from "primeng/api";
import {TableModule} from "primeng/table";
import {UploadedFilesComponent} from "../uploaded-files/uploaded-files.component";
import {Activity, Config, Context, EntitiesUsage, Entity, EntityUsage, Profile, Profiles, Remote} from "../interfaces";
import {ServerService} from "../server.service";
import {catchError, forkJoin, from, map, mergeMap, Observable, of} from "rxjs";
import {HttpErrorResponse, HttpEventType} from "@angular/common/http";
import {FormsModule} from "@angular/forms";
import {InputTextModule} from "primeng/inputtext";
import {TooltipModule} from "primeng/tooltip";
import {MenubarModule} from "primeng/menubar";
import {ToastModule} from "primeng/toast";
import {DropdownModule} from "primeng/dropdown";
import {ProgressSpinnerModule} from "primeng/progressspinner";
import {Helper} from "../helper";

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
    ActivityViewerComponent
  ],
  templateUrl: './remote-browser.component.html',
  styleUrl: './remote-browser.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RemoteBrowserComponent implements OnInit {
  @ViewChild("fileUpload", {static: false}) fileUpload: ElementRef | undefined;
  @ViewChild(UploadedFilesComponent) uploadedFilesComponent: UploadedFilesComponent | undefined;
  @ViewChild(RemoteRegistrationComponent) remoteComponent: RemoteRegistrationComponent | undefined;

  activities: Activity[] = [];
  entities: Entity[] = [];
  entity: Entity | undefined;
  suggestions: Entity[] = [];
  hoverEntity: Entity | undefined;
  outputObject: any = null;
  profiles: Profile[] = [];
  replace_entity: Entity | undefined;

  currentFile: FileProgress | undefined;
  context: Context | undefined;
  config: Config | undefined;
  remotes: Remote[] = [];
  selectedRemote: Remote | undefined;
  progress = false;
  remoteProgress = 0;
  protected readonly Math = Math;
  progressDetail = "";
  items: MenuItem[] = [
    /*{label: 'Unused entities', command: () => this.checkOrphans(), icon: 'pi pi-share-alt'},
    {label: 'Activities unused entities', command: () => this.checkUnassigned(), icon: 'pi pi-search'},
    {label: 'Upload backup', command: () => this.uploadFile(), icon: 'pi pi-upload'},
    {label: 'View backups', command: () => this.viewBackups(), icon: 'pi pi-folder-open'},*/
    {label: 'Manage Remotes', command: () => this.selectRemote(), icon: 'pi pi-mobile'},
    {label: 'Load Remote entities', command: () => this.loadRemoteData(), icon: 'pi pi-history', block: true},
    {label: 'Load Remote resources', command: () => this.loadRemoteResources(), icon: 'pi pi-images', block: true},
  ]
  entityUsages: EntityUsage | null | undefined;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
  }

  ngOnInit(): void {
    this.server.getConfig().subscribe(config => {
      this.updateRemote(config);
      this.server.config$.subscribe(config => {
        this.updateRemote(config);
      })
    })
    const entities = localStorage.getItem("entities");
    const activities = localStorage.getItem("activities");
    const profiles = localStorage.getItem("profiles");
    if (entities || activities)
    {
      if (activities) this.activities = JSON.parse(activities);
      if (entities) this.entities = JSON.parse(entities);
      if (profiles) this.profiles = JSON.parse(profiles);
      this.server.setEntities(this.entities);
      this.server.setActivities(this.activities);
      this.server.setProfiles(this.profiles);
      this.context = {source:"Cache", type: "Remote", date: new Date()};
      this.messageService.add({severity: "info", summary: `Remote data loaded from cache`});
      this.cdr.detectChanges();
    }
    else
      this.init();
  }

  clearCache()
  {
    localStorage.removeItem("entities");
    localStorage.removeItem("activities");
  }

  init(): void {
    this.server.getContext().subscribe(results => {
      console.info("Context", results);
      this.context = results;
      this.cdr.detectChanges();
    })
    this.server.getEntitiesFromBackup().subscribe(entities => {
      console.info("Entities", entities);
      this.entities = entities;
      this.cdr.detectChanges();
    })
    this.server.getActivitiesFromBackup().subscribe(activities => {
      console.info("Activities", activities);
      this.activities = activities;
      this.cdr.detectChanges();
    })
    this.server.getProfilesFromBackup().subscribe(results => {
      console.info("Profiles", results);
      this.profiles = Object.values(results);
      this.cdr.detectChanges();
    })

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
    this.remoteProgress = 0;
    // this.items.filter(item => (item as any).block == true).forEach(item => item.disabled = true);
    this.cdr.detectChanges();
    const tasks: Observable<any>[] = [];
    tasks.push(this.server.getRemoteEntities(this.selectedRemote).pipe(map((entities) => {
      this.entities = entities;
      // this.messageService.add({severity: "success", summary: `Remote data ${this.selectedRemote?.address}`,
      //   detail: `${this.entity_list.length} entities extracted`});
      this.cdr.detectChanges();
      return entities;
    })));
    tasks.push(this.server.getRemoteActivities(this.selectedRemote!).pipe(mergeMap((entities) => {
      this.activities = entities;
      this.messageService.add({severity: "success", summary: `Remote data ${this.selectedRemote?.address}`,
        detail: `${this.activities.length} activities extracted. Extracting details now...`});
      this.cdr.detectChanges();
      return from(this.activities).pipe(mergeMap(activity => {
        return this.server.getRemoteActivity(this.selectedRemote!, activity.entity_id!).pipe(map(activityDetails => {
          this.progressDetail = activity.name;
          const name = activity.name;
          Object.assign(activity, activityDetails);
          activity.name = name;
          if ((activityDetails as any).options?.included_entities)
            (activity as any).entities = (activityDetails as any).options.included_entities;
          this.remoteProgress += 100/this.activities.length;
          this.cdr.detectChanges();
          console.log("Activity", activity);
          return activity;
        }))
      }))
    })));
    tasks.push(this.server.getRemoteProfiles(this.selectedRemote).pipe(map(profiles => {
      this.profiles = profiles;
      console.log("Profiles", profiles);
      return profiles;
    })))

    forkJoin(tasks).subscribe({next: (results) => {
        this.messageService.add({
          severity: "success", summary: "Remote data loaded",
          detail: `${this.entities.length} entities and ${this.activities.length} activities extracted.`
        });
        this.context = {source: `${this.selectedRemote?.remote_name} (${this.selectedRemote?.address})`,
          date: new Date(), type: "Remote"}
        localStorage.setItem("entities", JSON.stringify(this.entities));
        localStorage.setItem("activities", JSON.stringify(this.activities));
        localStorage.setItem("profiles", JSON.stringify(this.profiles));
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.messageService.add({
          severity: "error", summary: "Error during remote data extraction"
        });
        this.cdr.detectChanges();
      },
      complete: () => {
        // this.items.filter(item => (item as any).block == true).forEach(item => item.disabled = false);
        this.progress = false;
        this.cdr.detectChanges();
      }})
  }

  updateRemote(config: Config): void
  {
    this.config = config;
    this.remotes = config.remotes!;
    const selectedRemoteAddress = localStorage.getItem('remote');
    if (selectedRemoteAddress)
    {
      this.selectedRemote = this.remotes.find(remote => remote.address === selectedRemoteAddress)
    }
    this.cdr.detectChanges();
  }

  setRemote(remote: Remote): void
  {
    localStorage.setItem('remote', remote.address);
    this.server.remote$.next(remote);
  }

  viewBackups(): void
  {
    this.uploadedFilesComponent?.loadFiles();
    this.uploadedFilesComponent!.visible = true;
    this.cdr.detectChanges();
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
      return entity.name;
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
    // this.entityUsages = this.usages[this.entity.entity_id!]; // TODO
    this.cdr.detectChanges();
  }

  searchEntity($event: AutoCompleteCompleteEvent) {
    if (!$event.query || $event.query.length == 0)
    {
      console.log("Search entity : whole list");
      this.suggestions = [...this.entities.sort((a, b) => {
        return (a.name ? a.name : "").localeCompare(b.name ? b.name : "");
      })];
      this.cdr.detectChanges();
      return;
    }
    this.server.getEntity($event.query).subscribe(results => {
      this.suggestions = [];
      for (let entity_id in results)
      {
        const entity = results[entity_id];
        entity.entity_id = entity_id;
        this.suggestions.push(entity);
      }
      this.suggestions.sort((a, b) => {
        return (a.name ? a.name : "").localeCompare(b.name ? b.name : "");
      })
      if (this.suggestions.length == 0)
      {
        this.replace_entity = {entity_id: $event.query, name: $event.query, entity_type: ""};
        // this.suggestions = [ {entity_id: $event.query, name: $event.query, entity_type: ""}];
      }
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

  stringToColor(value: string): string
  {
    let hash = 0;
    value.split('').forEach(char => {
      hash = char.charCodeAt(0) + ((hash << 5) - hash)
    })
    let colour = '#'
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff
      colour += value.toString(16).padStart(2, '0')
    }
    return colour
  }

  replaceEntity(entity_id: string, new_entity_id: string): any
  {
    /*const entity = this.entity_list.find(entity => entity.entity_id === entity_id);
    const entity_usage = this.usages[entity_id];
    if (!entity || !entity_usage) return;
    const modifications: any = {};

    const activityList = new Set(entity_usage
      .activity_entities.map(activity_entity => activity_entity.activity_id));
    entity_usage.activity_buttons.forEach(button => activityList.add(button.activity_id));

    Array.from(activityList).forEach(activityId => {
      const activity = this.entity_list.find(entity => entity.entity_id === activityId);
      if (!activity) return;
      const modification : any = { "entity_id" : activityId, "options": {
          "included_entities": [], "button_mapping": [], "sequences": []
        }};
      modifications[activity.filename!] = modification;
      entity_usage.activity_entities.filter(item => item.activity_id === activityId).forEach(item => {
        modification["options"]["included_entities"].push({"old_entity_id" : entity_id, "entity_id": new_entity_id});
      });
      entity_usage.activity_sequences.filter(item => item.activity_id === activityId).forEach(item => {
        modification["options"]["sequences"].push({"sequence_type": item.sequence_type, "cmd_id": item.cmd_id,
          "old_entity_id" : entity_id, "entity_id": new_entity_id});
      });
      entity_usage.activity_buttons.filter(item => item.activity_id === activityId).forEach(item => {
        let existing_button = modification["options"]["button_mapping"].find((button: any) => button.button === item.button);
        if (!existing_button)
        {
          existing_button = {"button": item.button};
          modification["options"]["button_mapping"].push(existing_button);
        }
        if (item.short_press)
          existing_button['short_press'] = {"old_entity_id" : entity_id, "entity_id": new_entity_id};
        else
          existing_button['long_press'] = {"old_entity_id" : entity_id, "entity_id": new_entity_id};
      })
    })

    const profiles = Array.from(new Set(entity_usage.pages.map(page => page.profile_id)));
    profiles.forEach(profileId => {
      const profile = this.profiles![profileId]!;
      modifications[profile.filename] = {"profile_id": profileId, "pages": []};
      const pages = entity_usage.pages.filter(page => page.profile_id === profileId);
      const pageIds = Array.from(new Set(pages.map(page => page.page_id)));
      pageIds.forEach(pageId => {
        const newPage: any = {"page_id": pageId, "items": []};
        const items = pages.filter(page => page.page_id === pageId);
        items.forEach(item => {
          newPage["items"].push({"old_entity_id" : entity_id, "entity_id": new_entity_id})
        })
        modifications[profile.filename]["pages"] = newPage;
      })
    })

    this.outputObject = modifications;
    this.cdr.detectChanges();
    return modifications;*/
  }

  uploadSelectedFile(file: FileProgress)
  {
    const formData = new FormData();
    formData.append('file', file.data);
    const filename = file.data.name;
    file.inProgress = true;
    this.server.upload(formData).pipe(map(event => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            file.progress = Math.round(event.loaded * 100 / event.total!);
            break;
          case HttpEventType.Response:
            return event;
        }
        return event;
      }),
      catchError((error: HttpErrorResponse) => {
        file.inProgress = false;
        this.messageService.add({severity: 'error', summary: `File ${filename} upload failed`});
        this.cdr.detectChanges();
        return of(`${file.data.name} upload failed.`);
      })).subscribe((event: any) => {
      if (event?.body != undefined)
      {
        console.log(event.body);
        this.currentFile = undefined;
        this.messageService.add({severity: 'success', summary: `File ${filename} uploaded successfully`});
        this.cdr.detectChanges();
      }
    });
  }

  uploadFile() {
    const fileUpload = this.fileUpload!.nativeElement;
    fileUpload.onchange = () => {
      const file = fileUpload.files[0];
      this.currentFile = {data: file, progress: 0, inProgress: false};
      this.uploadSelectedFile(this.currentFile);
      this.cdr.detectChanges();
    }
    fileUpload.click();
  }

  updateConfiguration() {
    this.init();
  }

  downloadFileResponse(response: Response, filename: string) {
    let dataType = response.type;
    let binaryData = [];
    binaryData.push(response);
    let downloadLink = document.createElement('a');
    downloadLink.href = window.URL.createObjectURL(new Blob(binaryData as any, {type: dataType}));
    if (filename)
      downloadLink.setAttribute('download', filename);
    document.body.appendChild(downloadLink);
    downloadLink.click();
  }

  downloadFile(url: string)
  {
    this.server.getBackup(url).subscribe(results => {
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
    this.progress = true;
    this.cdr.detectChanges();
    this.server.loadResources(this.selectedRemote, "Icon").subscribe({next: results => {
        this.messageService.add({severity: "success", summary: `Remote resources ${this.selectedRemote?.address} extracted successfully`});
        this.cdr.detectChanges();
      }, error: err => {
      console.error(err);
        this.messageService.add({severity: "error", summary: `Remote resources ${this.selectedRemote?.address} extraction failed`});
        this.cdr.detectChanges();
      },
      complete: () => {
      this.progress = false;
      this.cdr.detectChanges();
      }
    })
  }
}
