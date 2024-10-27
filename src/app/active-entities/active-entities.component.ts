import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation
} from '@angular/core';
import {DropdownModule} from "primeng/dropdown";
import {AsyncPipe, NgForOf, NgIf, NgSwitch, NgSwitchCase} from "@angular/common";
import {MenuItem, Message, MessageService, PrimeTemplate} from "primeng/api";
import {ProgressBarModule} from "primeng/progressbar";
import {ScrollingTextComponent} from "../controls/scrolling-text/scrolling-text.component";
import {TagModule} from "primeng/tag";
import {ServerService} from "../server.service";
import {MenubarModule} from "primeng/menubar";
import {Config, Dashboard, Entity, Remote, RemoteActivity, RemoteData} from "../interfaces";
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
import {WebsocketService} from "../websocket/websocket.service";
import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from "@angular/cdk/drag-drop";
import {DialogModule} from "primeng/dialog";
import {InputTextModule} from "primeng/inputtext";
import {BreakpointObserver, Breakpoints} from "@angular/cdk/layout";
import {RemoteWebsocket} from "../websocket/remote-websocket";
import {
  EntityState,
  MediaEntityState,
  RemoteState,
  RemoteWebsocketInstance
} from "../websocket/remote-websocket-instance";
import {firstValueFrom, forkJoin, from, map, mergeMap, of} from "rxjs";
import {ProgressSpinnerModule} from "primeng/progressspinner";
import {BlockUIModule} from "primeng/blockui";
import {RemoteDataLoaderComponent} from "../remote-data-loader/remote-data-loader.component";
import {LightEntityComponent} from "./light-entity/light-entity.component";
import {CoverEntityComponent} from "./cover-entity/cover-entity.component";
import {ClimateEntityComponent} from "./climate-entity/climate-entity.component";
import {ToggleButtonModule} from "primeng/togglebutton";

interface SelectedActivity extends RemoteActivity {
  collapsed?: boolean;
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
    InputTextModule,
    ProgressSpinnerModule,
    BlockUIModule,
    RemoteDataLoaderComponent,
    LightEntityComponent,
    NgSwitch,
    NgSwitchCase,
    CoverEntityComponent,
    ClimateEntityComponent,
    ToggleButtonModule
  ],
  templateUrl: './active-entities.component.html',
  styleUrl: './active-entities.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService]
})
export class ActiveEntitiesComponent implements OnInit, OnDestroy {
  remoteState: RemoteState | undefined;
  entityStates: EntityState[] = [];
  protected readonly Math = Math;
  menuItems: MenuItem[] = [
    {label: 'Home', routerLink: '/home', icon: 'pi pi-home'},
    {label: 'Reload', command: () => this.reloadEntities(), icon: 'pi pi-refresh'},
  ]
  selectedRemote: Remote | undefined;
  remotes: Remote[] | undefined;
  activities: RemoteActivity[] = [];
  newEntity: Entity | undefined;
  entities: Entity[] = [];
  allEntities: Entity[] = [];
  suggestions: Entity[] = [];
  selectedActivities: SelectedActivity[] = [];
  suggestedActivities: RemoteActivity[] = [];
  protected readonly Helper = Helper;
  newActivity: RemoteActivity | undefined;
  newRemote: Entity | undefined;
  suggestedRemotes: Entity[] = [];
  scale = 0.8;
  messages: Message[] = [];
  showDashboardDialog = false;
  dashboardName: string | undefined;
  selectedDashboard: Dashboard | undefined;
  lockDashboard = false;
  smallSizeMode = false;
  config: Config | undefined;
  additionalWebsockets: RemoteWebsocket[] = [];
  additionalWebsocketMedias: RemoteWebsocketInstance[] = [];
  progress = false;
  supported_entity_types = ['media_player', 'light', 'cover', 'climate'];
  removedEntityStates: string[] = [];


  constructor(private server:ServerService,
              private cdr:ChangeDetectorRef, private messageService: MessageService,
              protected websocketService: WebsocketService,
              private responsive: BreakpointObserver) {}

  ngOnInit(): void {
    const scale = localStorage.getItem("scale");
    if (scale) this.scale = Number.parseFloat(scale);
    const data = localStorage.getItem("remoteData");
    if (data) {
      const remoteData: RemoteData = JSON.parse(data);
      this.allEntities = remoteData.entities;
      this.entities = remoteData.entities.filter(item => this.supported_entity_types.includes(item.entity_type))
        .sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      if (this.activities.length == 0)
        this.activities = remoteData.activities.map(activity => {
          return {...activity, remote: remoteData.remote}
        });
      this.server.setEntities(remoteData.entities);
    }
    this.server.entities$.subscribe(entities => {
      this.entities = entities.filter(item => this.supported_entity_types.includes(item.entity_type))
        .sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.allEntities = entities;
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
    this.websocketService.onRemoteStateChange().subscribe(remoteState => {
      this.remoteState = remoteState;
      this.cdr.detectChanges();
    })
    this.websocketService.onMediaStateChange().subscribe(remoteState => {
      if (this.selectedDashboard)
      {
        remoteState.forEach(mediaState => {
          if (this.entityStates.includes(mediaState)) return;
          const existingEntity = this.entityStates.find(item => item.entity_id === mediaState.entity_id);
          if (existingEntity)
          {
            this.entityStates[this.entityStates.indexOf(existingEntity)] = mediaState;
          }
          else if (!this.lockDashboard && !this.removedEntityStates.includes(mediaState.entity_id))
            this.entityStates.push(mediaState);
        });
      }
      else
        this.entityStates = this.websocketService.getEntityStates();
      this.cdr.detectChanges();
    })
    this.websocketService.onActivityChange().subscribe(activities => {
      if (activities.length == 0) return;
      console.debug("Activity changes", activities);
      activities.forEach(activity => {
        const existing = this.activities.find(item => item.entity_id === activity.entity_id);
        if (existing) this.activities[this.activities.indexOf(existing)] = activity;
        else this.activities.push(activity);
      });
      this.cdr.detectChanges();
    });
    this.websocketService.onMediaPositionChange().subscribe(entities => {
      this.cdr.detectChanges();
    });
    this.websocketService.onLightChange().subscribe(entities => {
      entities.forEach(entityState => {
        const existingEntity = this.entityStates.find(item => item.entity_id === entityState.entity_id);
        if (existingEntity)
        {
          this.entityStates[this.entityStates.indexOf(existingEntity)] = entityState;
        }
        else if (!this.lockDashboard && !this.removedEntityStates.includes(entityState.entity_id))
          this.entityStates.push(entityState);
      });
      this.cdr.detectChanges();
    })
    this.websocketService.onCoverChange().subscribe(entities => {
      entities.forEach(entityState => {
        const existingEntity = this.entityStates.find(item => item.entity_id === entityState.entity_id);
        if (existingEntity)
        {
          this.entityStates[this.entityStates.indexOf(existingEntity)] = entityState;
        }
        else if (!this.lockDashboard && !this.removedEntityStates.includes(entityState.entity_id))
          this.entityStates.push(entityState);
      });
      this.cdr.detectChanges();
    })
    this.websocketService.onClimateChange().subscribe(entities => {
      entities.forEach(entityState => {
        const existingEntity = this.entityStates.find(item => item.entity_id === entityState.entity_id);
        if (existingEntity)
        {
          this.entityStates[this.entityStates.indexOf(existingEntity)] = entityState;
        }
        else if (!this.lockDashboard && !this.removedEntityStates.includes(entityState.entity_id))
          this.entityStates.push(entityState);
      });
      this.cdr.detectChanges();
    })
    this.server.getConfig().subscribe(config => {
      this.remotes = config.remotes!;
      this.selectedRemote  = Helper.getSelectedRemote(this.remotes);
      if (this.selectedRemote) {
        this.server.remote$.next(this.selectedRemote);
        this.loadActivities();
      }
      this.cdr.detectChanges();
    });
    this.server.getConfig().subscribe(config => {
      this.config = config;
      this.server.config$.subscribe(config => {
        this.config = config;
      })
    })
    this.cdr.detectChanges();
    this.responsive.observe([
      Breakpoints.HandsetLandscape,
      Breakpoints.HandsetPortrait,
      Breakpoints.TabletPortrait
    ])
      .subscribe(result => {
        this.smallSizeMode = result.matches;
        this.cdr.detectChanges();
      });
  }

  saveDashboard()
  {
    if (!this.selectedRemote || !this.dashboardName || (this.entityStates.length == 0 && this.selectedActivities.length == 0)) {
      this.messageService.add({severity: "error", summary: "No dashboard name defined or no entities selected", key: 'activeEntities'});
      this.cdr.detectChanges();
      return;
    }
    if (!this.config) return;
    this.showDashboardDialog = false;
    let dashboards = this.config.dashboards;
    if (!dashboards) {
      dashboards = [];
      this.config.dashboards = dashboards;
    }
    const dashboard: Dashboard = {name: this.dashboardName,
      dashboardEntityIds: this.entityStates.map(item =>
      {
        return {entity_id: item.entity_id!, entity_type: item.entity_type, remote_name: this.selectedRemote!.remote_name!}
      }),
      popupEntitiyIds: this.selectedActivities.map(item => {
        return {entity_id: item.entity_id!, entity_type: item.entity_type ? item.entity_type : 'activity', remote_name: this.selectedRemote!.remote_name!,
        collapsed: item.collapsed}
      }), lockDashboard: this.lockDashboard};
    const existingDashboard = dashboards.find(item => item.name === dashboard.name);
    if (existingDashboard) {
      dashboards.splice(dashboards.indexOf(existingDashboard), 1);
    }
    dashboards.push(dashboard);
    this.server.setConfig(this.config).subscribe(() => {
      this.messageService.add({severity: "success", summary: `Dashboard saved : ${this.dashboardName}`, key: 'activeEntities'});
      this.cdr.detectChanges();
    });
    this.cdr.detectChanges();
  }

  deleteDashboard(name: string)
  {
    if (!this.config) return;
    const dashboards = this.config.dashboards;
    if (!dashboards) return;
    const existingDashboard = dashboards.find(item => item.name === name);
    this.showDashboardDialog = false;
    if (existingDashboard) {
      dashboards.splice(dashboards.indexOf(existingDashboard), 1);
      this.server.setConfig(this.config).subscribe(() => {
        this.messageService.add({severity: "success", summary: `Dashboard deleted : ${name}}`, key: 'activeEntities'});
        this.cdr.detectChanges();
      });
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
      this.activities = activities.map(activity => {
        return {...activity, remote: this.selectedRemote!}
      });
      activities.forEach(activity => {
        if (activity.attributes?.state && activity.attributes.state === "ON"
          && this.selectedRemote && activity.entity_id)
        {
          this.server.getRemoteActivity(this.selectedRemote, activity.entity_id).subscribe(activity => {
            const existingActivity = this.activities.find(item => item.entity_id === activity.entity_id);
            if (!existingActivity)
              this.activities.push({...activity, remote: this.selectedRemote!});
            else
              Object.assign(existingActivity, activity);
            this.cdr.detectChanges();
            activity.options?.included_entities?.forEach(entity => {
              if (entity.entity_type !== "media_player") return; //TODO add other entities
              if (this.entityStates.find(item => item.entity_id === entity.entity_id)) return;
              if (this.selectedRemote && entity.entity_id)
              {
                this.websocketService.updateEntity(entity);
              }
            })
          })
        }
      })
    });
  }

  searchEntities($event: AutoCompleteCompleteEvent, entityType?: string) {
    if (!$event.query) this.suggestions = [...this.entities];
    this.suggestions = this.entities.filter(entity =>
      !this.entityStates.find(item => item.entity_id === entity.entity_id) &&
      Helper.getEntityName(entity).toLowerCase().includes($event.query.toLowerCase()));
    if (entityType) this.suggestions = this.suggestions.filter(item => item.entity_type === entityType);
  }

  addEntity(entity: Entity) {
    if (entity?.entity_id)
    {
      if (this.removedEntityStates.includes(entity.entity_id))
        this.removedEntityStates.splice(this.removedEntityStates.indexOf(entity.entity_id), 1);
      this.websocketService.updateEntity(entity);
      this.newEntity = undefined;
      this.cdr.detectChanges();
    }
  }

  searchRemotes($event: AutoCompleteCompleteEvent) {
    if (!this.allEntities) return;
    if (!$event.query) this.suggestedRemotes = this.allEntities.filter(entity => entity.entity_type === "remote")
      .sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
    this.suggestedRemotes = this.allEntities.filter(entity => entity.entity_type === 'remote' &&
      !this.selectedActivities.find(item => item.entity_id === entity.entity_id) &&
      Helper.getEntityName(entity).toLowerCase().includes($event.query.toLowerCase()))
      .sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
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

  addActivity($event: RemoteActivity) {
    if (!this.selectedRemote || !$event?.entity_id || this.selectedActivities.find(item => item.entity_id === $event.entity_id)) return;
    this.server.getRemoteActivity(this.selectedRemote, $event.entity_id).subscribe(activity => {
      this.selectedActivities.push({...activity, remote: $event.remote, collapsed: false});
    })
    this.cdr.detectChanges();
  }

  addRemote($event: Entity) {
    if (!this.selectedRemote || !$event?.entity_id || this.selectedActivities.find(item => item.entity_id === $event.entity_id)) return;
    this.server.getRemotetEntity(this.selectedRemote, $event.entity_id).subscribe(entity => {
      console.debug("Add remote entity", entity);
      this.selectedActivities.push({...entity as any, remote: this.selectedRemote!, collapsed: false});
    })
    this.cdr.detectChanges();
  }

  playActivity(activity: RemoteActivity) {
    if (!this.selectedActivities.find(activity => activity.entity_id === activity.entity_id)) {
      this.selectedActivities.push({...activity, collapsed: false});
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
    // if (this.websocketService.isRemoteConnected()) return;
    if (!this.selectedRemote) return;
    this.server.wakeRemote(this.selectedRemote).subscribe({next: results => {
        this.messageService.add({severity:'success', summary: "Wake on lan command sent", key: 'activeEntities'});
        this.websocketService.connect();
        this.cdr.detectChanges();
      },
      error: error => {
        console.error(error);
        this.messageService.add({severity:'error', summary: "Error while sending wake on lan command", key: 'activeEntities'});
        this.cdr.detectChanges();
      }
    });
    this.server.wakeRemote(this.selectedRemote, "255.255.255.0").subscribe({});
  }

  drop($event: CdkDragDrop<MediaEntityState[]>) {
    console.log("Drop", $event);
    moveItemInArray(this.entityStates, $event.previousIndex, $event.currentIndex);
    this.cdr.detectChanges();
  }

  async getWebsocket(remoteName: string): Promise<RemoteWebsocket | undefined>
  {
    let websocket = this.additionalWebsockets.find(websocket => websocket.getRemote()?.remote_name === remoteName);
    if (websocket) return websocket;
    const remote = this.remotes?.find(remote => { remote.remote_name === remoteName});
    if (!remote) {
      console.warn(`Can't find remote ${remoteName} to create websocket`);
      return undefined;
    }
    let key = await firstValueFrom(this.server.getRemoteKey(remote));
    websocket = new RemoteWebsocket(remote, key);
    if (key) this.additionalWebsockets.push(websocket);
    return websocket;
  }

  async getWebsocketInstance(remoteName: string)
  {
    let websocketMedia = this.additionalWebsocketMedias.find(item => item.getRemote()?.remote_name === remoteName);
    if (!websocketMedia)
    {
      const websocket = await this.getWebsocket(remoteName);
      if (!websocket) return undefined;
      websocketMedia = new RemoteWebsocketInstance(this.server, websocket);
      this.additionalWebsocketMedias.push(websocketMedia);
      websocketMedia.onMediaStateChange().subscribe(remoteState => {
        if (this.selectedDashboard)
        {
          remoteState.forEach(mediaState => {
            if (this.entityStates.includes(mediaState)) return;
            const existingEntity = this.entityStates.find(item => item.entity_id === mediaState.entity_id);
            if (existingEntity)
            {
              this.entityStates[this.entityStates.indexOf(existingEntity)] = mediaState;
            }
            else if (!this.lockDashboard)
              this.entityStates.push(mediaState);
          });
        }
        else //TODO not sure about that
          this.entityStates.push(...this.websocketService.getEntityStates());
        this.cdr.detectChanges();
      })
      websocketMedia.onMediaPositionChange().subscribe(entities => {
        this.cdr.detectChanges();
      });
    }
    return websocketMedia;
  }

  async selectDashboard(dashboard: Dashboard | undefined) {
    if (!dashboard || !this.selectedRemote) return;
    console.debug("Load dashboard", dashboard);
    this.dashboardName = dashboard.name;
    this.entityStates = [];
    this.lockDashboard = !!dashboard.lockDashboard;

    let remote = this.selectedRemote;
    for (let dashboardItem of dashboard.dashboardEntityIds)
    {
      let entityId: string | undefined;
      let remoteName = this.selectedRemote!.remote_name;
      let entity_type = "media_player";
      // Compatibility mode
      if (typeof (dashboardItem as any) === 'string')
        entityId = dashboardItem as any;
      else {
        entityId = dashboardItem.entity_id;
        remoteName = dashboardItem.remote_name;
        entity_type = dashboardItem.entity_type ? dashboardItem.entity_type : 'media_player';
      }
      let remote = this.remotes?.find(item => item.remote_name === remoteName);
      if (!remote) continue;
      if (remoteName && remoteName !== this.selectedRemote!.remote_name)
      {
        const websocketInstance = await this.getWebsocketInstance(remoteName);
        //TODO
        const mediaState = {remote, entity_id: entityId, new_state: {}} as any;
        if (!this.entityStates.find(item => item.entity_id === entityId)) this.entityStates.push(mediaState);
        websocketInstance?.addEntity(entityId!, entity_type);
        continue;
      }

      let entity = this.websocketService.getEntityStates().find(item => item.entity_id === entityId);
      if (!entity) {
        if (!this.entityStates.find(item => item.entity_id === entityId)) {
          const existing = this.entities.find(item => item.entity_id === entityId);
          if (existing) this.entityStates.push({remote: this.selectedRemote,entity_id: existing.entity_id!, entity_type: existing.entity_type,
            event_type:"", new_state: {attributes: existing.attributes, features: existing.features, ...existing?.options}});
          else
            this.entityStates.push({remote, entity_id: entityId!, entity_type, new_state: {}, event_type: ""});
        }
        this.websocketService.addEntity(entityId!, entity_type);
        // this.server.getRemotetEntity(remote, entityId!).subscribe(entity => {
        //   const existing = this.entityStates.find(item => item.entity_id === entityId);
        //   const mediaState = {...entity, new_state: {attributes: entity.attributes, features: entity.features}} as any;
        //   if (existing) this.entityStates[this.entityStates.indexOf(existing)] = mediaState;
        //   else this.entityStates.push(mediaState);
        //   this.websocketService.updateEntity(entity);
        //   this.cdr.detectChanges();
        // });
      }
      else {
        this.entityStates.push(entity);
      }
    }
    this.selectedActivities = [];
    for (let dashboardItem of dashboard.popupEntitiyIds)
    {
      let entityId: string | undefined;
      let remoteName = this.selectedRemote!.remote_name;
      // Compatibility mode
      if (typeof (dashboardItem as any) === 'string')
        entityId = dashboardItem as any;
      else {
        entityId = dashboardItem.entity_id;
        remoteName = dashboardItem.remote_name;
      }
      let remote = this.remotes?.find(item => item.remote_name === remoteName);
      if (!remote) continue;
      if (remoteName && remoteName !== this.selectedRemote!.remote_name)
      {
        const websocketMedia = await this.getWebsocketInstance(remoteName);
        // websocketMedia?.updateEntity(entityId!);
      }
      if (!this.selectedActivities.find(item => item.entity_id === entityId))
      {
        const existing = this.activities.find(item => item.entity_id === entityId);
        if (existing) this.selectedActivities.push({...existing, collapsed: !!dashboardItem.collapsed});
      }
      if (!dashboardItem.entity_type || dashboardItem.entity_type === "activity")
        this.server.getRemoteActivity(remote, entityId!).subscribe(activity => {
          const existing = this.selectedActivities.find(item => item.entity_id === entityId);
          if (existing)
          {
            this.selectedActivities.splice(this.selectedActivities.indexOf(existing), 1);
          }
          this.selectedActivities.push({...activity, remote, collapsed: !!dashboardItem.collapsed});
          this.cdr.detectChanges();
        })
      else {
        this.server.getRemotetEntity(remote, entityId!).subscribe(activity => {
          const existing = this.selectedActivities.find(item => item.entity_id === entityId);
          if (existing)
          {
            this.selectedActivities.splice(this.selectedActivities.indexOf(existing), 1);
          }
          this.selectedActivities.push({...activity as any, remote, collapsed: !!dashboardItem.collapsed});
          this.cdr.detectChanges();
        })
      }
    }
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.additionalWebsockets?.forEach(item => item.destroy());
    this.additionalWebsocketMedias?.forEach(item => item.destroy());
    this.additionalWebsockets = [];
    this.additionalWebsocketMedias = [];
  }

  remoteLoaded(remoteData: RemoteData | undefined) {
    if (!remoteData) return;
    this.entities = remoteData.entities.filter(item => this.supported_entity_types.includes(item.entity_type))
      .sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
    this.allEntities = remoteData.entities;
    this.activities = remoteData.activities.map(activity => {
      return {...activity, remote: remoteData.remote};
    });
    this.cdr.detectChanges();
  }

  removeEntityState(entityState: EntityState) {
    this.entityStates.splice(this.entityStates.indexOf(entityState), 1);
    if (!this.removedEntityStates.includes(entityState.entity_id))
      this.removedEntityStates.push(entityState.entity_id);
    this.cdr.detectChanges();
  }

  isLargeFormat(entityState: EntityState) {
    return !!(entityState.new_state as any)?.attributes?.media_image_url
  }

  private reloadEntities() {
    this.websocketService.reloadEntities()?.subscribe({next: res =>
    {
      // Websocket may not have the entities here (eg dashboard loaded from backup)
      console.log("First update results", res);
      const entitiesToUpdate: EntityState[] = [];
      this.entityStates.forEach(item => {
        if (!res || !res.find(updatedItem => updatedItem?.entity_id === item.entity_id))
          entitiesToUpdate.push(item);
      });
      if (entitiesToUpdate.length > 0) {
        const tasks = from(entitiesToUpdate).pipe(mergeMap(item => {
          return this.server.getRemotetEntity(item.remote, item.entity_id).pipe(map(entity => {
            const existing = this.entityStates.find(item => item.entity_id === entity.entity_id);
            const mediaState = {
              ...entity,
              new_state: {attributes: entity.attributes, features: entity.features}
            } as any;
            if (existing) this.entityStates[this.entityStates.indexOf(existing)] = mediaState;
            else this.entityStates.push(mediaState);
            this.cdr.detectChanges();
          }))
        }, 4));
        forkJoin([tasks]).subscribe(res => {
          this.messageService.add({
            severity: "success",
            summary: `${res.length + entitiesToUpdate.length} entities reloaded`,
            key: 'activeEntities'
          });
          this.cdr.detectChanges();
        })
      } else {
        this.messageService.add({
          severity: "success",
          summary: `${res.length} entities reloaded`,
          key: 'activeEntities'
        });
        this.cdr.detectChanges();
      }
    }/*, complete: () => {
        const tasks = from(this.entityStates).pipe(mergeMap(item => {
          return this.server.getRemotetEntity(item.remote ? item.remote : this.selectedRemote!, item.entity_id).pipe(map(entity => {
            const existing = this.entityStates.find(item => item.entity_id === entity.entity_id);
            const mediaState = {
              ...entity,
              new_state: {attributes: entity.attributes, features: entity.features}
            } as any;
            if (existing) this.entityStates[this.entityStates.indexOf(existing)] = mediaState;
            else this.entityStates.push(mediaState);
            this.cdr.detectChanges();
          }))
        }, 4));
        forkJoin([tasks]).subscribe(res => {
          this.messageService.add({
            severity: "success",
            summary: `${this.entityStates.length} entities reloaded`,
            key: 'activeEntities'
          });
          this.cdr.detectChanges();
        })
      }*/
  })
  }
}
