import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {MenuItem, MessageService, PrimeTemplate} from "primeng/api";
import {
  Entity,
  OperationStatus,
  Page,
  Profile,
  Remote,
  RemoteData,
  RemoteOperation,
  RemoteOperationResultField
} from "../interfaces";
import {Button} from "primeng/button";
import {SelectModule} from "primeng/select";
import {InputNumberModule} from "primeng/inputnumber";
import {MenubarModule} from "primeng/menubar";
import {NgForOf, NgIf} from "@angular/common";
import {ToastModule} from "primeng/toast";
import {TooltipModule} from "primeng/tooltip";
import {FormsModule} from "@angular/forms";
import {Helper} from "../helper";
import {ServerService} from "../server.service";
import {RemoteDataLoaderComponent} from "../remote-data-loader/remote-data-loader.component";
import {PageComponent} from "./page/page.component";
import {CdkDrag, CdkDragDrop, CdkDropList} from "@angular/cdk/drag-drop";
import {BlockUIModule} from "primeng/blockui";
import {ProgressSpinnerModule} from "primeng/progressspinner";
import {DialogModule} from "primeng/dialog";
import {InputTextModule} from "primeng/inputtext";
import {TagModule} from "primeng/tag";
import {RemoteOperationsComponent} from "../remote-operations/remote-operations.component";
import {saveAs} from "file-saver-es";
import {RemoteWidgetComponent} from "../remote-widget/remote-widget.component";


enum ModificationType {
  ModifyPage,
  DeletePage,
  AddPage
}


interface ModifiedPages {
  profile: Profile;
  page: Page;
  type: ModificationType;
}

@Component({
  selector: 'app-pages',
  standalone: true,
  imports: [
    Button,
    SelectModule,
    InputNumberModule,
    MenubarModule,
    NgForOf,
    NgIf,
    PrimeTemplate,
    ToastModule,
    TooltipModule,
    FormsModule,
    RemoteDataLoaderComponent,
    PageComponent,
    CdkDropList,
    CdkDrag,
    BlockUIModule,
    ProgressSpinnerModule,
    DialogModule,
    InputTextModule,
    TagModule,
    RemoteOperationsComponent,
    RemoteWidgetComponent
  ],
  templateUrl: './pages.component.html',
  styleUrl: './pages.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PagesComponent implements OnInit {
  menuItems: MenuItem[] = [
    {label: 'Home', routerLink: '/home', icon: 'pi pi-home'},
    {label: 'Load Remote data', command: () => this.loadRemote(), icon: 'pi pi-cloud-download', block: true},
    {label: 'Save pages to remote', command: () => this.updateRemote(), icon: 'pi pi-cloud-upload'},
    {label: 'Restore profile to remote', command: () => this.input_file?.nativeElement.click(), icon: 'pi pi-upload'},
  ]
  selectedRemote: Remote | undefined;
  remotes: Remote[] | undefined;
  entities: Entity[] = [];
  profiles: Profile[] = [];
  protected readonly Helper = Helper;
  editable = true;
  blockedMenu = false;
  progress = false;
  modifiedProfiles: ModifiedPages[] = [];
  @ViewChild(RemoteDataLoaderComponent) remoteLoader: RemoteDataLoaderComponent | undefined;
  @ViewChild("input_file", {static: false}) input_file: ElementRef | undefined;
  showOperations = false;
  remoteOperations: RemoteOperation[] = [];


  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {}

  ngOnInit()
  {
    const data = localStorage.getItem("remoteData");
    if (data) {
      const remoteData: RemoteData = JSON.parse(data);
      this.entities = remoteData.entities;
      this.profiles = remoteData.profiles;
      this.profiles.forEach(profile => this.reorderProfile(profile));
      console.log("Profiles", this.profiles);
      this.server.setEntities(remoteData.entities);
    }
    this.server.entities$.subscribe(entities => {
      this.entities = entities
        .sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.cdr.detectChanges();
    });
    this.server.remote$.subscribe(remote => {
      this.selectedRemote = remote;
      // this.loadActivities();
      this.cdr.detectChanges();
    })
    this.server.getConfig().subscribe(config => {
      this.remotes = config.remotes!;
      this.selectedRemote  = Helper.getSelectedRemote(this.remotes);
      if (this.selectedRemote) {
        this.server.remote$.next(this.selectedRemote);
      }
      this.cdr.detectChanges();
    });
  }

  setRemote(remote: Remote): void
  {
    Helper.setRemote(remote);
    this.server.remote$.next(remote);
    this.blockedMenu = true;
    this.progress = true;
    this.remoteLoader?.load();
    this.cdr.detectChanges();
  }

  remoteLoaded($event: RemoteData | undefined) {
    if ($event)
    {
      this.entities = $event.entities;
      this.profiles = $event.profiles;
      this.profiles.forEach(profile => this.reorderProfile(profile));
      console.log("Profiles", this.profiles);
      this.entities.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.blockedMenu = false;
      this.progress = false;
      this.remoteOperations = [];
      this.modifiedProfiles = [];
      this.cdr.detectChanges();
    }
  }

  reorderProfile(profile: Profile)
  {
    profile.pages?.sort((a, b) => a.pos - b.pos);
  }

  drop($event: CdkDragDrop<any, any>, profile: Profile) {
    let pos = 1
    for (let item of profile.pages)
    {
      item.pos = pos;
      pos++;
    }
  }

  updatePendingModifications(profile: Profile, page: Page)
  {
    const entry = this.modifiedProfiles.find(item => item.profile.profile_id === profile.profile_id
      && item.page.page_id === page.page_id);
    if (!entry) {
      this.modifiedProfiles.push({profile, page, type: ModificationType.ModifyPage});
      this.cdr.detectChanges();
    }
  }

  deletePage($event: Page, profile: Profile) {
    const index = profile.pages.indexOf($event);
    if (index && index > -1) {
      profile.pages.splice(index, 1);
      this.modifiedProfiles.push({profile, page: $event, type: ModificationType.DeletePage});
      this.cdr.detectChanges();
    }
  }

  private updateRemote() {
    this.remoteOperations = [];
    this.modifiedProfiles.forEach(item => {
      if (item.type === ModificationType.DeletePage)
      {
        this.remoteOperations.push({status: OperationStatus.Todo,
          message: `Delete page ${item.page.name} from profile ${item.profile.name}`,
          method: "DELETE",
          api: `/api/profiles/${item.profile.profile_id}/pages/${item.page.page_id}`,
          body: {}
          });
        return;
      }
      if (!item.page.items) item.page.items = [];
      this.remoteOperations.push({status: OperationStatus.Todo,
       message: `Update page ${item.page.name} from profile ${item.profile.name}`,
       method: "PATCH",
       api: `/api/profiles/${item.profile.profile_id}/pages/${item.page.page_id}`,
       body: {
         page_id: item.page.page_id,
         profile_id: item.profile.profile_id,
         pos: item.page.pos,
         image: item.page.image,
         name: item.page.name,
         items: [...item.page.items]
       }})
    });
    if (this.remoteOperations.length > 0)
      this.showOperations = true;
    else {
      this.messageService.add({severity: "warn", summary: "No pending operations", key: "pages"});
    }
    this.cdr.detectChanges();
  }

  updatePage($event: Page, profile: Profile) {
    this.updatePendingModifications(profile,$event);
  }


  operationsDone($event: RemoteOperation[]) {
    this.messageService.add({severity: "success", summary: "Pages updated", key: "pages"});
    this.cdr.detectChanges();
  }

  saveProfile(profile: Profile) {
    if (!profile) return;
    saveAs(new Blob([JSON.stringify(profile)], {type: "text/plain;charset=utf-8"}),
      `profile_${profile.name}.json`);
  }

  setProfile(profile: Profile)
  {
    this.blockedMenu = true;
    this.progress = true;
    this.cdr.detectChanges();
    this.remoteLoader?.loadRemoteData().subscribe(results => {
      this.blockedMenu = false;
      this.progress = false;
      this.cdr.detectChanges();
      if (!results) {
        this.messageService.add({severity: "error", summary: "Unable to retrieve remote data", key: "pages", sticky: true});
        this.cdr.detectChanges();
        return;
      }
      this.profiles =results.profiles;
      const existing = this.profiles.find(entry => entry.profile_id === profile.profile_id);
      if (existing)
      {
        this.profiles.splice(this.profiles.indexOf(existing), 1);
        this.profiles.push(profile);
        this.cdr.detectChanges();
      }
      this.remoteOperations = [];
      const mappedGroup: RemoteOperationResultField[] = [];
      if (existing) {
        if (existing.pages && existing.pages?.length > 0)
          this.remoteOperations.push({ status: OperationStatus.Todo,
            message: `Delete pages from existing profile ${profile.name}`,
            method: "DELETE",
            api: `/api/profiles/${profile.profile_id}/pages`,
            body: {}});

        if (existing.groups && existing.groups?.length > 0)
          this.remoteOperations.push({status: OperationStatus.Todo,
            message: `Delete groups from existing profile ${profile.name}`,
            method: "DELETE",
            api: `/api/profiles/${profile.profile_id}/groups`,
            body: {}});

        profile.groups?.forEach(group => {
          const body = {...group};
          delete (body as any).group_id;
          // delete (body as any).profile_id;
          const operation: RemoteOperation = {status: OperationStatus.Todo,
            message: `Add group ${group.name}`,
            method: "POST",
            api: `/api/profiles/${profile.profile_id}/groups`,
            body};
          this.remoteOperations.push(operation);
          mappedGroup.push({fieldName: "group_id", contentKey: group.group_id, linkedOperation: operation});
        });

        profile.pages.forEach(page => {
          const body = {...page};
          delete (body as any).page_id;
          // delete (body as any).profile_id;
          this.remoteOperations.push({status: OperationStatus.Todo,
            message: `Add page ${page.name}`,
            method: "POST",
            api: `/api/profiles/${profile.profile_id}/pages`,
            body, resultFields: mappedGroup});
        });
      }
      else {
        const createProfileoperation: RemoteOperation = {status: OperationStatus.Todo,
          message: `Create new profile ${profile.name}`,
          method: "POST",
          api: `/api/profiles`,
          body: {
            name: profile.name,
            restricted: profile.restricted
          }};
        this.remoteOperations.push(createProfileoperation);

        profile.groups?.forEach(group => {
          const body = {...group};
          delete (body as any).group_id;
          delete (body as any).profile_id;
          body.profile_id = "<PROFILE_ID>";
          const operation: RemoteOperation = {status: OperationStatus.Todo,
            message: `Add group ${group.name}`,
            method: "POST",
            api: `/api/profiles/<PROFILE_ID>/groups`,
            body,
            resultFields: [{fieldName: "profile_id", linkedOperation: createProfileoperation, keyName: "<PROFILE_ID>"},
              {fieldName: "profile_id", contentKey: '<PROFILE_ID>', linkedOperation: createProfileoperation}
            ],};
          this.remoteOperations.push(operation);
          mappedGroup.push({fieldName: "group_id", contentKey: group.group_id, linkedOperation: operation});
        });

        profile.pages.forEach(page => {
          const body = {...page};
          delete (body as any).page_id;
          delete (body as any).profile_id;
          body.profile_id = "<PROFILE_ID>";
          this.remoteOperations.push({status: OperationStatus.Todo,
            message: `Add page ${page.name}`,
            method: "POST",
            api: `/api/profiles/<PROFILE_ID>/pages`,
            body, resultFields: [...mappedGroup,
              {fieldName: "profile_id", contentKey: '<PROFILE_ID>', linkedOperation: createProfileoperation},
              {fieldName: "profile_id", linkedOperation: createProfileoperation, keyName: "<PROFILE_ID>"}]});
        });
      }
      this.showOperations = true;
    })
  }

  loadInputFile($event: Event) {
    const file = ($event.target as any)?.files?.[0];
    let fileReader = new FileReader();
    fileReader.onload = (e) => {
      if (fileReader.result){
        const profile: Profile = JSON.parse(fileReader.result.toString());
        this.setProfile(profile);
        this.cdr.detectChanges();
      }
    }
    fileReader.readAsText(file);
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
        // if (value?.profiles)
        //   this.profiles = value.profiles;
        this.cdr.detectChanges();
      }, error: error => {
        console.error("Error during remote extraction", error);
        this.blockedMenu = false;
        this.progress = false;
        this.messageService.add({severity:'error', summary:'Error during remote extraction'});
        this.cdr.detectChanges();
      }});
  }
}
