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
import {Message, MessageService, PrimeTemplate} from "primeng/api";
import {ActivityViewerComponent} from "../activity-viewer/activity-viewer.component";
import {ServerService} from "../server.service";
import {MediaEntityState, RemoteWebsocketService} from "../remote-websocket.service";
import {Activity, ButtonMapping, Command, Entity, EntityCommand, Remote, UIPage} from "../interfaces";
import {Helper} from "../helper";
import {Button} from "primeng/button";
import {TooltipModule} from "primeng/tooltip";
import {ActivityButtonsComponent, ButtonMode} from "../activity-viewer/activity-buttons/activity-buttons.component";
import {NgIf} from "@angular/common";
import {catchError, delay, forkJoin, from, map, mergeMap, Observable, of} from "rxjs";
import {ActivityGridComponent} from "../activity-viewer/activity-grid/activity-grid.component";
import {ToastModule} from "primeng/toast";
import {HttpErrorResponse} from "@angular/common/http";
import {ProgressBarModule} from "primeng/progressbar";
import {PaginationComponent} from "../controls/pagination/pagination.component";
import {RouterLink} from "@angular/router";
import {IconComponent} from "../controls/icon/icon.component";
import {SliderComponent} from "../controls/slider/slider.component";

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
    RouterLink,
    IconComponent,
    SliderComponent
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
    if (this.remote) {
      this.server.getConfigEntityCommands(this.remote).subscribe(entityCommands => {
        this.configEntityCommands = entityCommands;
        this.cdr.detectChanges();
      });
      this.update();
    }
  }
  activity: Activity | undefined;
  @Input("activity") set _activity (activity: Activity | undefined) {
    this.activity = activity;
    console.log("Play activity", this.activity);
    this.currentPage = activity?.options?.user_interface?.pages?.[0];
    this.update();
    this.cdr.detectChanges();
  }
  @Input() visible = false;
  @Input() scale = 0.7;
  @Output() onClose: EventEmitter<ActivityPlayerComponent> = new EventEmitter();
  @Output() onMessage: EventEmitter<Message> = new EventEmitter();
  minimized = false;
  currentPage: UIPage | undefined;
  progress = 0;
  progressDetail: string | undefined;
  volumeEntity: MediaEntityState | undefined;

  constructor(private server:ServerService, protected remoteWebsocketService: RemoteWebsocketService,
              private cdr:ChangeDetectorRef, private messageService: MessageService) {
    this.remoteWebsocketService.onMediaStateChange().subscribe(mediaStates => {
      if (!this.volumeEntity) return;
      const state = mediaStates.find(item => item.entity_id === this.volumeEntity!.entity_id!);
      if (state) {
        this.volumeEntity = state;
        this.cdr.detectChanges();
      }
    })
  }

  update() {
    if (!this.remote || !this.activity) return;
    this.getVolumeEntity().subscribe(mediaState => {
      if (!mediaState) return;
      console.log("Volume entity", mediaState);
      this.volumeEntity = mediaState;
      this.cdr.detectChanges();
    })
  }

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

  handleCommand($event:  {command: Command, mode: ButtonMode, severity: "success" | "error", error?: string}) {
    let message = "Short press ";
    if ($event.mode === ButtonMode.ShortPress) message = `Short press `;
    else if ($event.mode === ButtonMode.LongPress) message = `Long press `;
    else if ($event.mode === ButtonMode.DoublePress) message = `Double press `;
    let entityName = Helper.getEntityName(this.activity?.options?.included_entities?.find(item => item.entity_id === $event.command.entity_id));
    if (!entityName ||entityName === "") entityName = $event.command.entity_id;
    const commandName = Helper.getCommandName($event.command, this.configEntityCommands);
    message += `${entityName} ${commandName}`;
    if ($event.error)
      message = `${message} : ${$event.error}`;
    this.onMessage.emit({severity: $event.severity, detail: message});
  }

  handleMessage($event:  {button: ButtonMapping, mode: ButtonMode, severity: "success" | "error", error?: string}) {
    let message = "Short press";
    const command = $event.mode == ButtonMode.ShortPress ? $event.button.short_press :
      ($event.mode == ButtonMode.LongPress ? $event.button.long_press : $event.button.double_press);
    if (!command) return;
    let entityName = Helper.getEntityName(this.activity?.options?.included_entities?.find(item => item.entity_id === command.entity_id));
    if (!entityName ||entityName === "") entityName = command.entity_id;
    const commandName = Helper.getCommandName(command, this.configEntityCommands);

    if ($event.mode === ButtonMode.ShortPress) message = `Short press ${entityName} ${commandName}`;
    else if ($event.mode === ButtonMode.LongPress) message = `Long press ${entityName} ${commandName}`;
    else if ($event.mode === ButtonMode.DoublePress) message = `Double press ${entityName} ${commandName}`;
    if ($event.error)
      message = `${message} : ${$event.error}`;
    this.onMessage.emit({severity: $event.severity, detail: message});
  }

  getVolumeEntity(): Observable<MediaEntityState|undefined>
  {
    if (!this.remote) return of(undefined);
    const button = this.activity?.options?.button_mapping?.find(button => button.button === 'VOLUME_UP');
    const volumeEntity = button?.short_press?.entity_id;
    if (!volumeEntity) return of(undefined);
    const entity = this.activity?.options?.included_entities?.find(entity => entity.entity_id === volumeEntity);
    if (!entity || entity.entity_type !== 'media_player') return of(undefined);
    return this.server.getRemotetEntity(this.remote, entity.entity_id!).pipe(map(entity => {
      if (!Helper.checkFeature(entity, "volume")) return undefined;
      return {...entity, new_state: {attributes: {...entity.attributes}, features: entity.features}} as MediaEntityState;
    }))
  }

  updateVolume(volume: number, entity_id: string) {
    if (!this.remote) return;
    console.debug("Volume update", volume, entity_id);
    let name = Helper.getEntityName(this.volumeEntity);
    if (!name || name === "") name = entity_id;
    this.server.executeRemotetCommand(this.remote, {entity_id,
      cmd_id:"media_player.volume", params: {"volume": volume}}).subscribe({
      next: (results) => {
        this.onMessage.emit({severity: "success", detail: `Volume set ${name} : ${volume}%`});
      },
        error: err => this.onMessage.emit({severity: "error",
          detail: `Error volume set ${name} : ${volume}% (${err.toString()})`})
      });
  }

  protected readonly Math = Math;
}