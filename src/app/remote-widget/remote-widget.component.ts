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
import {SelectModule} from "primeng/select";
import {FormsModule} from "@angular/forms";
import {Activity, Remote} from "../interfaces";
import {MediaEntityComponent} from "../active-entities/media-entity/media-entity.component";
import {DropdownOverComponent} from "../controls/dropdown-over/dropdown-over.component";
import {WebsocketService} from "../websocket/websocket.service";
import {ToastModule} from "primeng/toast";
import {MessageService} from "primeng/api";
import {MediaEntityState, RemoteState, SoftwareUpdate} from "../websocket/remote-websocket-instance";
import {BreakpointObserver, Breakpoints, BreakpointState} from "@angular/cdk/layout";
import {Observable} from "rxjs";
import {Tooltip} from "primeng/tooltip";

interface WidgetConfiguration {
  minimized: boolean;
}

@Component({
    selector: 'app-remote-widget',
    imports: [
        DialogModule,
        Button,
        TagModule,
        NgIf,
        AsyncPipe,
        DockModule,
        ProgressBarModule,
        ScrollingTextComponent,
        SelectModule,
        FormsModule,
        MediaEntityComponent,
        ToastModule,
        Tooltip
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
  softwareUpdate: SoftwareUpdate | undefined;
  smallSizeMode : Observable<BreakpointState> | undefined;

  constructor(private server:ServerService, protected websocketService: WebsocketService, private cdr:ChangeDetectorRef,
              private messageService: MessageService,
              private responsive: BreakpointObserver) { }

  ngOnInit(): void {
    const data = localStorage.getItem("remote-widget");
    if (data)
    {
      const widgetConfiguration: WidgetConfiguration = JSON.parse(data);
      this.minimized = widgetConfiguration.minimized;
    }
    const scale = localStorage.getItem("scale");
    if (scale) this.scale = Number.parseFloat(scale);
    this.websocketService.onRemoteStateChange().subscribe(remoteState => {
      this.remoteState = remoteState;
      this.cdr.detectChanges();
    })
    this.websocketService.onMediaStateChange().subscribe(remoteState => {
      this.mediaEntity = this.websocketService.mediaEntity;
      this.mediaEntities = this.websocketService.mediaEntities;
      // console.log("Media entities updated", this.mediaEntity, this.mediaEntities);
      this.cdr.detectChanges();
    })
    this.websocketService.onMediaPositionChange().subscribe(entities => {
      this.cdr.detectChanges();
    });
    this.websocketService.onSofwareUpdateChange().subscribe(state => {
      this.softwareUpdate = state;
      this.cdr.detectChanges();
    })
    this.server.remote$.subscribe(remote => {
      this.remote = remote;
      this.server.getRemoteBattery(this.remote).subscribe(batteryInfo => {
        this.remoteState = {batteryInfo};
        this.cdr.detectChanges();
      })
      this.loadActivities();
      this.cdr.detectChanges();
    });
    this.smallSizeMode = this.responsive.observe([
      Breakpoints.HandsetLandscape,
      Breakpoints.HandsetPortrait,
      Breakpoints.TabletPortrait
    ]);
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
                this.websocketService.updateEntity(entity);
              }
            })
          })
        }
      })
    });
  }

  changedMediaEntity($event: any) {
    this.websocketService.mediaEntity = this.mediaEntity;
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

  getSoftwareProgress() {
    if (!this.softwareUpdate?.progress) return 0;
    if (this.softwareUpdate.progress.state === 'START' || this.softwareUpdate.progress.state === 'RUN') return 0;
    let offset = 0; let percent = 0;
    if (this.softwareUpdate.progress.total_steps)
    {
      offset = Math.round(100/this.softwareUpdate.progress.total_steps);
      percent = offset/100;
    }
    if (this.softwareUpdate.progress.state === 'PROGRESS')
    {
      const step_offset = offset * (this.softwareUpdate.progress.current_step - 1);
      return (percent*this.softwareUpdate.progress.current_percent + step_offset);
    }
    if (this.softwareUpdate.progress.state === 'SUCCESS') return 100;
    return 0;
  }
}
