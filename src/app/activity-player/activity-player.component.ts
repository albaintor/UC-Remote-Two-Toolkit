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
import {MessageService, PrimeTemplate} from "primeng/api";
import {ActivityViewerComponent} from "../activity-viewer/activity-viewer.component";
import {ServerService} from "../server.service";
import {RemoteWebsocketService} from "../remote-widget/remote-websocket.service";
import {Activity, EntityCommand, Remote, UIPage} from "../interfaces";
import {Helper} from "../helper";
import {Button} from "primeng/button";
import {TooltipModule} from "primeng/tooltip";
import {ActivityButtonsComponent} from "../activity-viewer/activity-buttons/activity-buttons.component";
import {NgIf} from "@angular/common";
import {catchError, delay, forkJoin, from, map, mergeMap, of} from "rxjs";
import {ActivityGridComponent} from "../activity-viewer/activity-grid/activity-grid.component";
import {ToastModule} from "primeng/toast";
import {HttpErrorResponse} from "@angular/common/http";
import {ProgressBarModule} from "primeng/progressbar";
import {PaginationComponent} from "../controls/pagination/pagination.component";
import {RouterLink} from "@angular/router";

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
    ActivityGridComponent,
    ToastModule,
    ProgressBarModule,
    PaginationComponent,
    RouterLink
  ],
  templateUrl: './activity-player.component.html',
  styleUrl: './activity-player.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService]
})
export class ActivityPlayerComponent {
  remote: Remote | undefined;
  configEntityCommands: EntityCommand[] | undefined;
  @Input('remote') set _remote(value: Remote | undefined) {
    this.remote = value;
    if (this.remote)
      this.server.getConfigEntityCommands(this.remote).subscribe(entityCommands => {
        this.configEntityCommands = entityCommands;
        this.cdr.detectChanges();
      })
  }
  activity: Activity | undefined;
  @Input("activity") set _activity (activity: Activity | undefined) {
    this.activity = activity;
    this.currentPage = activity?.options?.user_interface?.pages?.[0];
    this.cdr.detectChanges();
  }
  @Input() visible = false;
  @Input() scale = 0.7;
  @Output() onClose: EventEmitter<ActivityPlayerComponent> = new EventEmitter();
  minimized = false;
  currentPage: UIPage | undefined;
  progress = 0;
  progressDetail: string | undefined;

  constructor(private server:ServerService, protected remoteWebsocketService: RemoteWebsocketService,
              private cdr:ChangeDetectorRef, private messageService: MessageService) { }

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
    }).subscribe({next: results =>
      {
        this.messageService.add({
          key: "activityPlayer", summary: `Sequence executed`,
          severity: "success", detail: `Results : ${results.code} : ${results.message}`
        });
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.messageService.add({key: "activityPlayer", summary: `Sequence executed`,
          severity: "error", detail: `Results : ${err.error.code} : ${err.error.message}`});
        this.cdr.detectChanges();
      }
    });
  }

  executeSequence(sequenceName: string) {
    if (!this.activity?.options?.sequences?.[sequenceName] || !this.remote) return;
    const remote = this.remote;
    this.progress = 0;
    this.progressDetail = "";
    this.cdr.detectChanges();
    const steps = this.activity.options.sequences[sequenceName].length;
    const errors: string[] = [];
    forkJoin([from(this.activity.options.sequences[sequenceName]).pipe(mergeMap(command => {
      if (command.type === "delay" && command.delay)
      {
        this.progressDetail = `Delay ${command.delay}ms`;
        this.cdr.detectChanges();
        return of(true).pipe(delay(command.delay), map(res=> {
          this.progress += 100/steps;
          this.cdr.detectChanges();
        }));
      }
      else if (command.command) {
        const entity = this.activity?.options?.included_entities?.find(item => item.entity_id === command.command?.entity_id);
        this.progressDetail = `Command ${Helper.getEntityName(entity)} : ${Helper.getCommandName(command.command, this.configEntityCommands)}`
        this.cdr.detectChanges();
        return this.server.executeRemotetCommand(remote, command.command).pipe(catchError(err => {
          console.error("Error executing sequence", err);
          errors.push(err.toString());
          return of(command);
        }), map(results => {
          this.progress += 100/steps;
          this.cdr.detectChanges();
        }))
      }
      return of(command);
    },1))]).subscribe(results => {
      if (errors.length > 0)
        this.messageService.add({key: "activityPlayer", summary: `Sequence ${sequenceName} executed`,
          severity: "warning", detail: `Results : ${errors.length} errors during operations (${errors.join(", ")})`});
      else
        this.messageService.add({key: "activityPlayer", summary: `Sequence ${sequenceName} executed`,
          severity: "success"});
      this.progressDetail = undefined;
      this.progress = 0;
      this.cdr.detectChanges();
    })
  }

  selectPage($event: number) {
    this.currentPage = this.activity?.options?.user_interface?.pages?.[$event];
    this.cdr.detectChanges();
  }
}
