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
import {ScrollingTextComponent} from "../controls/scrolling-text/scrolling-text.component";
import {DropdownModule} from "primeng/dropdown";
import {FormsModule} from "@angular/forms";
import {MediaEntityState, RemoteState, RemoteWebsocketService} from "../remote-websocket.service";
import {Activity, Remote, RemoteData} from "../interfaces";
import {MediaEntityComponent} from "../active-entities/media-entity/media-entity.component";
import {DropdownOverComponent} from "../controls/dropdown-over/dropdown-over.component";
import {WebsocketService} from "../websocket.service";
import {ToastModule} from "primeng/toast";
import {MessageService} from "primeng/api";

interface WidgetConfiguration {
  minimized: boolean;
}

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
    DropdownOverComponent,
    ToastModule
  ],
  templateUrl: './remote-widget.component.html',
  styleUrl: './remote-widget.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class RemoteWidgetComponent implements OnInit {
  @Input() visible = true;
  @Input() scale = 0.8;
  @Input() minimized = false;
  @Input() remote: Remote | undefined;
  remoteState: RemoteState | undefined;
  mediaEntity: MediaEntityState | undefined;
  mediaEntities: MediaEntityState[] = [];
  activities: Activity[] = [];
  protected readonly Math = Math;

  constructor(private server:ServerService, private websocketService: WebsocketService,
              protected remoteWebsocketService: RemoteWebsocketService, private cdr:ChangeDetectorRef,
              private messageService: MessageService,) { }

  ngOnInit(): void {
    const data = localStorage.getItem("remote-widget");
    if (data)
    {
      const widgetConfiguration: WidgetConfiguration = JSON.parse(data);
      this.minimized = widgetConfiguration.minimized;
    }
    const scale = localStorage.getItem("scale");
    if (scale) this.scale = Number.parseFloat(scale);
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
    this.remoteWebsocketService.onMediaPositionChange().subscribe(entities => {
      this.cdr.detectChanges();
    });
    this.server.remote$.subscribe(remote => {
      this.remote = remote;
      this.server.getRemoteBattery(this.remote).subscribe(batteryInfo => {
        this.remoteState = {batteryInfo};
        this.cdr.detectChanges();
      })
      this.loadActivities();
      this.cdr.detectChanges();
    })
  }

  loadActivities()
  {
    if (!this.remote) return;
    this.server.getRemoteActivities(this.remote).subscribe(activities => {
      this.activities = activities;
      activities.forEach(activity => {
        if (activity.attributes?.state && activity.attributes.state === "ON"
          && this.remote && activity.entity_id)
        {
          this.server.getRemoteActivity(this.remote, activity.entity_id).subscribe(activity => {
            const existingActivity = this.activities.find(item => item.entity_id === activity.entity_id);
            if (!existingActivity)
              this.activities.push(activity);
            else
              Object.assign(existingActivity, activity);
            this.cdr.detectChanges();
            activity.options?.included_entities?.forEach(entity => {
              if (entity.entity_type !== "media_player") return; //TODO add other entities
              if (this.mediaEntities.find(item => item.entity_id === entity.entity_id)) return;
              if (this.remote && entity.entity_id)
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

  toggleMinimized() {
    this.minimized = !this.minimized;
    const widgetConfiguration: WidgetConfiguration = { minimized: this.minimized};
    localStorage.setItem("remote-widget", JSON.stringify(widgetConfiguration));
    this.cdr.detectChanges();
  }

  wakeRemote($event: MouseEvent) {
    if (!this.remote) return;
    this.server.wakeRemote(this.remote).subscribe({next: results => {
        this.messageService.add({severity:'success', summary: "Wake on lan command sent", key: 'widget'});
        this.websocketService.connect();
        this.cdr.detectChanges();
      },
      error: error => {
        console.error(error);
        this.messageService.add({severity:'error', summary: "Error while sending wake on lan command", key: 'widget'});
        this.cdr.detectChanges();
      }
    });
    this.server.wakeRemote(this.remote, "255.255.255.0").subscribe({});
  }
}
