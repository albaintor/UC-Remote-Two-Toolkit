import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  ViewEncapsulation
} from '@angular/core';
import {ServerService} from "../server.service";
import {DialogModule} from "primeng/dialog";
import {Button} from "primeng/button";
import {TagModule} from "primeng/tag";
import {AsyncPipe, DatePipe, NgIf} from "@angular/common";
import {DockModule} from "primeng/dock";
import {ProgressBarModule} from "primeng/progressbar";
import {ScrollingTextComponent} from "./scrolling-text/scrolling-text.component";
import {DropdownModule} from "primeng/dropdown";
import {FormsModule} from "@angular/forms";
import {MediaEntityState, RemoteState, RemoteWebsocketService} from "./remote-websocket.service";
import {Activity, Remote, RemoteData} from "../interfaces";
import {MediaEntityComponent} from "../active-entities/media-entity/media-entity.component";
import {DropdownOverComponent} from "../controls/dropdown-over/dropdown-over.component";


@Component({
  selector: 'app-remote-widget',
  standalone: true,
  imports: [
    DialogModule,
    Button,
    TagModule,
    NgIf,
    AsyncPipe,
    DatePipe,
    DockModule,
    ProgressBarModule,
    ScrollingTextComponent,
    DropdownModule,
    FormsModule,
    MediaEntityComponent,
    DropdownOverComponent
  ],
  templateUrl: './remote-widget.component.html',
  styleUrl: './remote-widget.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class RemoteWidgetComponent implements OnInit {
  @Input() visible = true;
  minimized = false;
  remoteState: RemoteState | undefined;
  mediaEntity: MediaEntityState | undefined;
  mediaEntities: MediaEntityState[] = [];
  selectedRemote: Remote | undefined;
  activities: Activity[] = [];

  constructor(private server:ServerService, protected remoteWebsocketService: RemoteWebsocketService, private cdr:ChangeDetectorRef) { }

  ngOnInit(): void {
    this.remoteWebsocketService.onRemoteStateChange().subscribe(remoteState => {
      this.remoteState = remoteState;
      this.cdr.detectChanges();
    })
    this.remoteWebsocketService.onMediaStateChange().subscribe(remoteState => {
      this.mediaEntity = this.remoteWebsocketService.mediaEntity;
      this.mediaEntities = this.remoteWebsocketService.mediaEntities;
      console.log("Media entities updated", this.mediaEntity, this.mediaEntities);
      this.cdr.detectChanges();
    })
    this.server.remote$.subscribe(remote => {
      this.selectedRemote = remote;
      this.server.getRemoteBattery(this.selectedRemote).subscribe(batteryInfo => {
        this.remoteState = {batteryInfo};
        this.cdr.detectChanges();
      })
      this.loadActivities();
      this.cdr.detectChanges();
    })
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

  changedMediaEntity($event: any) {
    this.remoteWebsocketService.mediaEntity = this.mediaEntity;
  }

  protected readonly Math = Math;
}
