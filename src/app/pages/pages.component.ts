import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {MenuItem, MessageService, PrimeTemplate} from "primeng/api";
import {Entity, Page, Profile, Remote, RemoteData, RemoteOperation} from "../interfaces";
import {Button} from "primeng/button";
import {DropdownModule} from "primeng/dropdown";
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

interface ModifiedPages {
  profile: Profile;
  page: Page;
}

@Component({
  selector: 'app-pages',
  standalone: true,
  imports: [
    Button,
    DropdownModule,
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
    RemoteOperationsComponent
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
    {label: 'Save pages to remote', command: () => this.updateRemote(), icon: 'pi pi-cloud-upload'},
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
      this.modifiedProfiles.push({profile, page});
      this.cdr.detectChanges();
    }
  }

  deletePage($event: Page, profile: Profile) {
    const index = profile.pages.indexOf($event);
    if (index && index > -1) {
      profile.pages.splice(index, 1);
      this.updatePendingModifications(profile,$event);
      this.cdr.detectChanges();
    }
  }

  private updateRemote() {
    this.remoteOperations = [];
    this.modifiedProfiles.forEach(item => {
      if (!item.page.items) item.page.items = [];
      this.remoteOperations.push({
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
    this.cdr.detectChanges();
  }

  updatePage($event: Page, profile: Profile) {
    this.updatePendingModifications(profile,$event);
  }


  operationsDone($event: RemoteOperation[]) {
    this.messageService.add({severity: "success", summary: "Pages updated", key: "pages"});
    this.cdr.detectChanges();
  }
}
