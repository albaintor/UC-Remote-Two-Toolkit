import {ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {TableModule} from "primeng/table";
import {ServerService} from "../server.service";
import {Activities, Activity, Context, Entities, EntitiesUsage, Entity, EntityUsage, Profiles} from "../interfaces";
import {CommonModule} from "@angular/common";
import {ChipModule} from "primeng/chip";
import {OverlayPanelModule} from "primeng/overlaypanel";
import {AutoCompleteCompleteEvent, AutoCompleteModule} from "primeng/autocomplete";
import {FormsModule} from "@angular/forms";
import {NgxJsonViewerModule} from "ngx-json-viewer";
import {InputTextModule} from "primeng/inputtext";
import {ButtonModule} from "primeng/button";
import {TooltipModule} from "primeng/tooltip";
import {MenubarModule} from "primeng/menubar";
import {MenuItem, MenuItemCommandEvent, MessageService} from "primeng/api";
import {ToastModule} from "primeng/toast";
import {catchError, map, of} from "rxjs";
import {HttpErrorResponse, HttpEventType} from "@angular/common/http";
import {ProgressBarModule} from "primeng/progressbar";
import {UploadedFilesComponent} from "../uploaded-files/uploaded-files.component";
import {RemoteRegistrationComponent} from "../remote-registration/remote-registration.component";

interface FileProgress
{
  data: File;
  inProgress: boolean;
  progress : number;
}

@Component({
  selector: 'app-home',
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
    RemoteRegistrationComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {

  activities: Activities = {};
  entities: Entities = {};
  activity_list: Activity[] = [];
  entity_list: Entity[] = [];
  entity: Entity | undefined;
  suggestions: Entity[] = [];
  usages: EntitiesUsage = {};
  entityUsages: EntityUsage | undefined;
  hoverEntity: Entity | undefined;
  outputObject: any = null;
  profiles: Profiles | undefined;
  replace_entity: Entity | undefined;
  items: MenuItem[] = [
    {label: 'Unused entities', command: () => this.checkOrphans(), icon: 'pi pi-share-alt'},
    {label: 'Activities unused entities', command: () => this.checkUnassigned(), icon: 'pi pi-search'},
    {label: 'Upload backup', command: () => this.uploadFile(), icon: 'pi pi-upload'},
    {label: 'View backups', command: () => this.viewBackups(), icon: 'pi pi-folder-open'},
    {label: 'Select Remote', command: () => this.selectRemote(), icon: 'pi pi-mobile'}
  ]
  @ViewChild("fileUpload", {static: false}) fileUpload: ElementRef | undefined;
  @ViewChild(UploadedFilesComponent) uploadedFilesComponent: UploadedFilesComponent | undefined;
  @ViewChild(RemoteRegistrationComponent) remoteComponent: RemoteRegistrationComponent | undefined;

  currentFile: FileProgress | undefined;
  context: Context | undefined;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
  }
  ngOnInit(): void {
    this.init();
  }

  init(): void {
    this.server.getContext().subscribe(results => {
      console.info("Context", results);
      this.context = results;
      this.cdr.detectChanges();
    })
    this.server.getEntities().subscribe(results => {
      console.info("Entities", results);
      this.entities = results;
      this.entity_list =[];
      for (let entity_id in this.entities)
      {
        this.entities[entity_id].entity_id = entity_id;
        this.entity_list.push(this.entities[entity_id]);
      }
      this.cdr.detectChanges();
    })
    this.server.getActivities().subscribe(results => {
      console.info("Activities", results);
      this.activities = results;
      this.activity_list =[];
      for (let activity_id in this.activities)
      {
        this.activities[activity_id].activity_id = activity_id;
        this.activity_list.push(this.activities[activity_id]);
      }
      this.cdr.detectChanges();
    })
    this.server.getUsages().subscribe(results => {
      console.info("Entities usages", results);
      this.usages = results;
      this.cdr.detectChanges();
    })
    this.server.getProfiles().subscribe(results => {
      console.info("Profiles", results);
      this.profiles = results;
      this.cdr.detectChanges();
    })
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

  checkUnassigned(): void
  {
    const results: any = {};
    for (let entity_id in this.usages)
    {
      const entity = this.usages[entity_id];
      if (entity.activity_entities.length > 0 &&
        entity.activity_buttons.length == 0 && entity.activity_interface.length == 0
      )
      {
        results[entity_id] = entity;
      }
    }
    this.outputObject = results;
    this.messageService.add({ severity: 'success', summary: 'Unassigned extracted'});
    this.cdr.detectChanges();
  }
  checkOrphans(): void
  {
    this.server.getOrphans().subscribe(results => {
      this.outputObject = results;
      this.messageService.add({ severity: 'success', summary: 'Orphans extracted'});
      this.cdr.detectChanges();
    })
  }

  showEntity(entityId: string)
  {
    this.hoverEntity = this.entities[entityId];
  }

  getEntityName(entityId: string): string
  {
    const entity = this.entities[entityId];
    if (entity?.name)
      return entity.name;
    return `Unknown ${entityId}`;
  }

  selectEntity(entity: Entity | string | undefined) {
    if (!entity) return;
    if (typeof entity === 'string')
      this.entity = this.entities[entity as string];
    else
      this.entity = entity as Entity;
    if (!this.entity) return;
    this.entityUsages = this.usages[this.entity.entity_id!];
    this.cdr.detectChanges();
  }

  searchEntity($event: AutoCompleteCompleteEvent) {
    if (!$event.query || $event.query.length == 0)
    {
      console.log("Search entity : whole list");
      this.suggestions = [...this.entity_list.sort((a, b) => {
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
    const entity = this.entities[entity_id];
    const entity_usage = this.usages[entity_id];
    if (!entity || !entity_usage) return;
    const modifications: any = {};

    const activityList = new Set(entity_usage
      .activity_entities.map(activity_entity => activity_entity.activity_id));
    entity_usage.activity_buttons.forEach(button => activityList.add(button.activity_id));

    Array.from(activityList).forEach(activityId => {
      const activity = this.entities[activityId];
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
    return modifications;
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
}
