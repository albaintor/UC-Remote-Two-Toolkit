import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewEncapsulation} from '@angular/core';
import {DropdownModule} from "primeng/dropdown";
import {AsyncPipe, NgForOf, NgIf} from "@angular/common";
import {MenuItem, PrimeTemplate} from "primeng/api";
import {ProgressBarModule} from "primeng/progressbar";
import {ScrollingTextComponent} from "../controls/scrolling-text/scrolling-text.component";
import {TagModule} from "primeng/tag";
import {MediaEntityState, RemoteState, RemoteWebsocketService} from "../remote-widget/remote-websocket.service";
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
    ActivityPlayerComponent
  ],
  templateUrl: './active-entities.component.html',
  styleUrl: './active-entities.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
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

  constructor(private server:ServerService, protected remoteWebsocketService: RemoteWebsocketService, private cdr:ChangeDetectorRef) { }

  ngOnInit(): void {
    const data = localStorage.getItem("remoteData");
    if (data) {
      const remoteData: RemoteData = JSON.parse(data);
      this.entities = remoteData.entities.filter(item => item.entity_type === 'media_player');
      this.server.setEntities(remoteData.entities);
    }
    this.server.entities$.subscribe(entities => {
      this.entities = entities.filter(item => item.entity_type === 'media_player');
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
    if (!$event.query) this.suggestedActivities = [...this.activities];
    this.suggestedActivities = this.activities.filter(entity =>
      !this.selectedActivities.find(item => item.entity_id === entity.entity_id) &&
      Helper.getEntityName(entity).toLowerCase().includes($event.query.toLowerCase()));
  }

  addActivity($event: Activity) {
    if (!this.selectedRemote || !$event?.entity_id || this.selectedActivities.find(item => item.entity_id === $event.entity_id)) return;
    this.server.getRemoteActivity(this.selectedRemote, $event.entity_id).subscribe(activity => {
      this.selectedActivities.push(activity);
    })
    this.cdr.detectChanges();
  }

  removeActivity($event: ActivityPlayerComponent) {
    console.log("REMOVED");
    if (!this.selectedActivities.find(item => item.entity_id === $event.activity?.entity_id)) return;
    this.selectedActivities.splice(this.selectedActivities.indexOf(
      this.selectedActivities.find(item => item.entity_id === $event.activity?.entity_id)!
    ), 1);

    this.cdr.detectChanges();
  }
}
