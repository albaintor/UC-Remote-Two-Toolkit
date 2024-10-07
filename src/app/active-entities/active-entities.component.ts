import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewEncapsulation} from '@angular/core';
import {DropdownModule} from "primeng/dropdown";
import {AsyncPipe, NgForOf, NgIf} from "@angular/common";
import {MenuItem, Message, MessageService, PrimeTemplate} from "primeng/api";
import {ProgressBarModule} from "primeng/progressbar";
import {ScrollingTextComponent} from "../controls/scrolling-text/scrolling-text.component";
import {TagModule} from "primeng/tag";
import {MediaEntityState, RemoteState, RemoteWebsocketService} from "../remote-websocket.service";
import {ServerService} from "../server.service";
import {MenubarModule} from "primeng/menubar";
import {Activity, Entity, Remote, RemoteData} from "../interfaces";
import {FormsModule} from "@angular/forms";
import {Helper} from "../helper";
import {SliderComponent} from "../controls/slider/slider.component";
import {Button} from "primeng/button";
import {DropdownOverComponent} from "../controls/dropdown-over/dropdown-over.component";
import {MediaEntityComponent} from "./media-entity/media-entity.component";
import {AutoCompleteCompleteEvent, AutoCompleteModule} from "primeng/autocomplete";
import {ActivityPlayerComponent} from "../activity-player/activity-player.component";
import {InputNumberModule} from "primeng/inputnumber";
import {MessagesModule} from "primeng/messages";
import {ToastModule} from "primeng/toast";
import {WebsocketService} from "../websocket.service";
import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from "@angular/cdk/drag-drop";
import {DialogModule} from "primeng/dialog";
import {InputTextModule} from "primeng/inputtext";

interface Dashboard
{
  name: string;
  dashboardEntityIds: string[];
  popupEntitiyIds: string[];
}

@Component({
  selector: 'app-active-entities',
  standalone: true,
  imports: [
    DropdownModule,
    NgIf,
    PrimeTemplate,
    ProgressBarModule,
    ScrollingTextComponent,
    TagModule,
    NgForOf,
    AsyncPipe,
    MenubarModule,
    FormsModule,
    SliderComponent,
    Button,
    DropdownOverComponent,
    MediaEntityComponent,
    AutoCompleteModule,
    ActivityPlayerComponent,
    InputNumberModule,
    MessagesModule,
    ToastModule,
    CdkDropList,
    CdkDrag,
    DialogModule,
    InputTextModule
  ],
  templateUrl: './active-entities.component.html',
  styleUrl: './active-entities.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService]
})
export class ActiveEntitiesComponent implements OnInit {
  remoteState: RemoteState | undefined;
  mediaEntities: MediaEntityState[] = [];
  protected readonly Math = Math;
  menuItems: MenuItem[] = [
    {label: 'Home', routerLink: '/home', icon: 'pi pi-home'},
  ]
  selectedRemote: Remote | undefined;
  remotes: Remote[] | undefined;
  activities: Activity[] = [];
  newEntity: Entity | undefined;
  entities: Entity[] = [];
  suggestions: Entity[] = [];
  selectedActivities: Activity[] = [];
  suggestedActivities: Activity[] = [];
  protected readonly Helper = Helper;
  newActivity: Activity | undefined;
  scale = 0.8;
  messages: Message[] = [];
  dashboards: Dashboard[] = [];
  showDashboardDialog = false;
  dashboardName: string | undefined;
  selectedDashboard: Dashboard | undefined;

  constructor(private server:ServerService, protected remoteWebsocketService: RemoteWebsocketService,
              private cdr:ChangeDetectorRef, private messageService: MessageService,
              private websocketService: WebsocketService) {}

  ngOnInit(): void {
    const scale = localStorage.getItem("scale");
    if (scale) this.scale = Number.parseFloat(scale);
    const data = localStorage.getItem("remoteData");
    if (data) {
      const remoteData: RemoteData = JSON.parse(data);
      this.entities = remoteData.entities.filter(item => item.entity_type === 'media_player')
        .sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.server.setEntities(remoteData.entities);
    }
    this.server.entities$.subscribe(entities => {
      this.entities = entities.filter(item => item.entity_type === 'media_player')
        .sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.cdr.detectChanges();
    });
    this.server.remote$.subscribe(remote => {
      this.selectedRemote = remote;
      this.server.getRemoteBattery(this.selectedRemote).subscribe(batteryInfo => {
        this.remoteState = {batteryInfo};
        this.cdr.detectChanges();
      })
      this.loadActivities();
      this.cdr.detectChanges();
    })
    this.remoteWebsocketService.onRemoteStateChange().subscribe(remoteState => {
      this.remoteState = remoteState;
      this.cdr.detectChanges();
    })
    this.remoteWebsocketService.onMediaStateChange().subscribe(remoteState => {
      this.mediaEntities = this.remoteWebsocketService.mediaEntities;
      this.cdr.detectChanges();
    })
    this.remoteWebsocketService.onMediaPositionChange().subscribe(entities => {
      this.cdr.detectChanges();
    });
    this.server.getConfig().subscribe(config => {
      this.remotes = config.remotes!;
      this.selectedRemote  = Helper.getSelectedRemote(this.remotes);
      if (this.selectedRemote) {
        this.server.remote$.next(this.selectedRemote);
        this.loadActivities();
      }
      this.cdr.detectChanges();
    });
    this.dashboards = this.getDashboards();
    this.cdr.detectChanges();
  }

  getDashboards(): Dashboard[]
  {
    const dashboards = localStorage.getItem("dashboards");
    if (dashboards) {
      return JSON.parse(dashboards);
    }
    return [];
  }

  saveDashboard()
  {
    if (!this.dashboardName || this.mediaEntities.length == 0 ||this.selectedActivities.length == 0) {
      this.messageService.add({severity: "error", summary: "No dashboard name defined or no entities selected", key: 'activeEntities'});
      this.cdr.detectChanges();
      return;
    }
    this.showDashboardDialog = false;
    const dashboards = this.getDashboards();
    const dashboard: Dashboard = {name: this.dashboardName, dashboardEntityIds: this.mediaEntities.map(item => item.entity_id!),
      popupEntitiyIds: this.selectedActivities.map(item => item.entity_id!)};
    const existingDashboard = dashboards.find(item => item.name === dashboard.name);
    if (existingDashboard) {
      dashboards.splice(dashboards.indexOf(existingDashboard), 1);
    }
    dashboards.push(dashboard);
    localStorage.setItem("dashboards", JSON.stringify(dashboards));
    this.dashboards = this.getDashboards();
    this.messageService.add({severity: "success", summary: `Dashboard saved : ${this.dashboardName}`, key: 'activeEntities'});
    this.cdr.detectChanges();
  }

  deleteDashboard(name: string)
  {
    const dashboards = this.getDashboards();
    const existingDashboard = dashboards.find(item => item.name === name);
    this.showDashboardDialog = false;
    if (existingDashboard) {
      dashboards.splice(dashboards.indexOf(existingDashboard), 1);
      this.dashboards = this.getDashboards();
      this.messageService.add({severity: "success", summary: `Dashboard deleted : ${name}`, key: 'activeEntities'});
      this.cdr.detectChanges();
    } else {
      this.messageService.add({severity: "error", summary: `No dashboard found with name ${name}`, key: 'activeEntities'});
      this.cdr.detectChanges();
    }
  }

  loadActivities()
  {
    if (!this.selectedRemote) return;
    this.server.getRemoteActivities(this.selectedRemote).subscribe(activities => {
      this.activities = activities;
      activities.forEach(activity => {
        if (activity.attributes?.state && activity.attributes.state === "ON"
          && this.selectedRemote && activity.entity_id)
        {
          this.server.getRemoteActivity(this.selectedRemote, activity.entity_id).subscribe(activity => {
            const existingActivity = this.activities.find(item => item.entity_id === activity.entity_id);
            if (!existingActivity)
              this.activities.push(activity);
            else
              Object.assign(existingActivity, activity);
            this.cdr.detectChanges();
            activity.options?.included_entities?.forEach(entity => {
              if (entity.entity_type !== "media_player") return; //TODO add other entities
              if (this.mediaEntities.find(item => item.entity_id === entity.entity_id)) return;
              if (this.selectedRemote && entity.entity_id)
              {
                this.remoteWebsocketService.updateEntity(entity.entity_id);
              }
            })
          })
        }
      })
    });
  }

  setRemote(remote: Remote) {
    this.server.remote$.next(remote);
    this.cdr.detectChanges();
  }

  searchEntities($event: AutoCompleteCompleteEvent) {
    if (!$event.query) this.suggestions = [...this.entities];
    this.suggestions = this.entities.filter(entity =>
      !this.mediaEntities.find(item => item.entity_id === entity.entity_id) &&
      Helper.getEntityName(entity).toLowerCase().includes($event.query.toLowerCase()));
  }

  addEntity($event: Entity) {
    if ($event?.entity_id)
    {
      this.remoteWebsocketService.updateEntity($event.entity_id);
      this.newEntity = undefined;
      this.cdr.detectChanges();
    }
  }

  searchActivities($event: AutoCompleteCompleteEvent) {
    if (!this.activities) return;
    if (!$event.query) this.suggestedActivities = [...this.activities]
      .sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
    this.suggestedActivities = this.activities.filter(entity =>
      !this.selectedActivities.find(item => item.entity_id === entity.entity_id) &&
      Helper.getEntityName(entity).toLowerCase().includes($event.query.toLowerCase()))
      .sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
  }

  addActivity($event: Activity) {
    if (!this.selectedRemote || !$event?.entity_id || this.selectedActivities.find(item => item.entity_id === $event.entity_id)) return;
    this.server.getRemoteActivity(this.selectedRemote, $event.entity_id).subscribe(activity => {
      this.selectedActivities.push(activity);
    })
    this.cdr.detectChanges();
  }

  playActivity(activity: Activity) {
    if (!this.selectedActivities.includes(activity)) {
      this.selectedActivities.push(activity);
      this.cdr.detectChanges();
    }
  }

  removeActivity($event: ActivityPlayerComponent) {
    if (!this.selectedActivities.find(item => item.entity_id === $event.activity?.entity_id)) return;
    this.selectedActivities.splice(this.selectedActivities.indexOf(
      this.selectedActivities.find(item => item.entity_id === $event.activity?.entity_id)!
    ), 1);

    this.cdr.detectChanges();
  }

  handleMessage($event: Message) {
    this.messages = [$event];
    this.cdr.detectChanges();
  }

  wakeRemote($event: MouseEvent) {
    // if (this.remoteWebsocketService.isRemoteConnected()) return;
    if (!this.selectedRemote) return;
    this.server.wakeRemote(this.selectedRemote).subscribe({next: results => {
        this.messageService.add({severity:'success', summary: "Wake on lan command sent", key: 'activeEntities'});
        this.websocketService.connect();
        this.cdr.detectChanges();
      },
      error: error => {
        this.messageService.add({severity:'error', summary: "Wake on lan command sent", key: 'activeEntities'});
        this.cdr.detectChanges();
      }
    });
    this.server.wakeRemote(this.selectedRemote, "255.255.255.0").subscribe({});
  }

  drop($event: CdkDragDrop<MediaEntityState[]>) {
    console.log("Drop", $event);
    moveItemInArray(this.mediaEntities, $event.previousIndex, $event.currentIndex);
    this.cdr.detectChanges();
  }

  selectDashboard(dashboard: Dashboard | undefined) {
    if (!dashboard || !this.selectedRemote) return;
    this.dashboardName = dashboard.name;
    this.mediaEntities = [];
    const remote = this.selectedRemote;
    dashboard.dashboardEntityIds.forEach(entityId => {
      let entity = this.remoteWebsocketService.mediaEntities.find(item => item.entity_id === entityId);
      if (!entity) this.server.getRemotetEntity(remote, entityId).subscribe(entity => {
        this.mediaEntities.push({...entity, new_state: {attributes: entity.attributes, features: entity.features }} as any);
        this.cdr.detectChanges();
      })
      else this.mediaEntities.push(entity);
    });
    this.selectedActivities = [];
    dashboard.popupEntitiyIds.forEach(entityId => {
      this.server.getRemoteActivity(remote, entityId).subscribe(activity => {
        this.selectedActivities.push(activity);
        this.cdr.detectChanges();
      })
    })
    this.cdr.detectChanges();
  }
}
