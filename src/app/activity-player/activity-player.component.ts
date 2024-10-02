import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation
} from '@angular/core';
import {DialogModule} from "primeng/dialog";
import {PrimeTemplate} from "primeng/api";
import {ActivityViewerComponent} from "../activity-viewer/activity-viewer.component";
import {ServerService} from "../server.service";
import {RemoteWebsocketService} from "../remote-widget/remote-websocket.service";
import {Activity, Remote, UIPage} from "../interfaces";
import {Helper} from "../helper";
import {Button} from "primeng/button";
import {TooltipModule} from "primeng/tooltip";
import {ActivityButtonsComponent} from "../activity-viewer/activity-buttons/activity-buttons.component";
import {NgIf} from "@angular/common";
import {delay, from, map, mergeMap, of} from "rxjs";
import {ActivityGridComponent} from "../activity-viewer/activity-grid/activity-grid.component";

@Component({
  selector: 'app-activity-player',
  standalone: true,
  imports: [
    DialogModule,
    PrimeTemplate,
    ActivityViewerComponent,
    Button,
    TooltipModule,
    ActivityButtonsComponent,
    NgIf,
    ActivityGridComponent
  ],
  templateUrl: './activity-player.component.html',
  styleUrl: './activity-player.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ActivityPlayerComponent {
  @Input() remote : Remote | undefined;
  activity: Activity | undefined;
  @Input("activity") set _activity (activity: Activity | undefined) {
    this.activity = activity;
    this.currentPage = activity?.options?.user_interface?.pages?.[0];
    this.cdr.detectChanges();
  }
  @Input() visible = false;
  @Output() onClose: EventEmitter<ActivityPlayerComponent> = new EventEmitter();
  minimized = false;
  currentPage: UIPage | undefined;

  constructor(private server:ServerService, protected remoteWebsocketService: RemoteWebsocketService, private cdr:ChangeDetectorRef) { }

  protected readonly Helper = Helper;

  closeDialog($event: Event) {
    this.onClose.emit(this);
    this.visible = false;
    this.cdr.detectChanges();
  }

  executeActivity(cmd_id: string) {
    if (!this.activity?.entity_id || !this.remote) return;
    this.server.executeRemotetCommand(this.remote, {
      entity_id: this.activity.entity_id,
      cmd_id
    }).subscribe();
  }

  executeSequence(sequenceName: string) {
    if (!this.activity?.options?.sequences?.[sequenceName] || !this.remote) return;
    const remote = this.remote;
    from(this.activity.options.sequences[sequenceName]).pipe(mergeMap(command => {
      if (command.type === "delay" && command.delay)
      {
        return of(true).pipe(delay(command.delay*1000));
      }
      else if (command.command)
        return this.server.executeRemotetCommand(remote, command.command)
      return of(command);
    },1)).subscribe(results => {

    })
  }
}
