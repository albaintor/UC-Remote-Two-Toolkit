import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, EventEmitter,
  Input, OnDestroy,
  OnInit,
  Output,
  ViewEncapsulation
} from '@angular/core';
import {ServerService} from "../server.service";
import {webSocket, WebSocketSubject} from 'rxjs/webSocket';
import {BatteryState, Entity, Remote} from "../interfaces";
import {
  BehaviorSubject, delay,
  Observable,
  retry,
  share,
  Subject,
  Subscription, takeWhile,
  timer
} from "rxjs";
import {DialogModule} from "primeng/dialog";
import {Button} from "primeng/button";
import {distinctUntilChanged, filter, map, skip, take, tap} from "rxjs/operators";
import {TagModule} from "primeng/tag";
import {AsyncPipe, DatePipe, NgIf} from "@angular/common";
import {DockModule} from "primeng/dock";
import {ProgressBarModule} from "primeng/progressbar";
import {ScrollingTextComponent} from "./scrolling-text/scrolling-text.component";
import {Helper} from "../helper";
import {DropdownModule} from "primeng/dropdown";
import {FormsModule} from "@angular/forms";


interface Message
{
  kind: "req"|"resp"|"event";
  msg_data: any;
}

interface RequestMessage extends Message {
  kind: "req";
  msg: string;
  id: number;
}

interface ResponseMessage extends Message {
  kind: "resp";
  code: number;
  msg: string;
  req_id: number;
}

interface EventMessage extends Message {
  kind: "event";
  msg: string;
}

interface MediaEntityState
{
  entity_id: string;
  entity_type: string;
  event_type: string;
  new_state?: {
    attributes?: {
      media_artist?: string;
      media_album?: string;
      media_title?: string;
      media_duration?: number;
      media_position?: number;
      media_image_url?: string;
      media_type?: string;
      source?: string;
      volume?: number;
      state?: string;
    }
  }
}



const RECONNECT_INTERVAL = 5000;


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
    FormsModule
  ],
  templateUrl: './remote-widget.component.html',
  styleUrl: './remote-widget.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class RemoteWidgetComponent implements OnInit, OnDestroy {
  remote: Remote | undefined;
  key: string | undefined;
  websocket:  WebSocketSubject<Message> | undefined;
  messageEvent: Subject<Message> = new Subject();
  messageId = 0;
  reconnecInterval = RECONNECT_INTERVAL;
  status$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  @Output() messageReceived: EventEmitter<Message> = new EventEmitter();
  mediaEntity : MediaEntityState | undefined;
  mediaEntities: MediaEntityState[] = [];
  batteryState: BatteryState | undefined;
  private mediaPositionTask: Subscription | undefined;
  mediaPosition: number | undefined;
  entities: Entity[] = [];

  @Input("remote") set _remote(value: Remote | undefined) {
    if (value == this.remote) return;
    this.remote = value;
    this.reset();
    if (value) {
      this.server.getRemoteKey(value).subscribe(key => {
        this.key = key;
        this.cdr.detectChanges();
        this.connect();
      });
    }
  }
  @Input() visible = true;
  minimized = false;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef) { }

  reset()
  {
    this.mediaEntities = [];
    this.mediaEntity = undefined;
    this.mediaPosition = undefined;
    this.batteryState = undefined;
  }

  ngOnInit(): void {
    this.entities = this.server.getCachedEntities();
    this.server.entities$.subscribe(entities => this.entities = entities);
    if (this.remote)
      this.server.getRemoteKey(this.remote).subscribe(key => {
        this.key = key;
        this.connect();
        this.cdr.detectChanges();
      });
    this.initWidget();
  }

  public get connectionStatus$(): Observable<boolean> {
    return this.status$.pipe(distinctUntilChanged());
  }

  getEntityName(mediaEntity:  MediaEntityState | undefined): string
  {
    if (!mediaEntity) return "";
    const entity = this.entities.find(item => item.entity_id === mediaEntity?.entity_id);
    if (!entity) return mediaEntity.entity_id;
    return Helper.getEntityName(entity);
  }

  initWidget()
  {
    this.getMessageEvent().subscribe(message => {
      if (message.kind === "event")
      {
        const eventMessage = message as EventMessage;
        if (eventMessage.msg == "entity_change" &&
          eventMessage.msg_data?.entity_type === "media_player")
        {
          this.handleMediaPlayerEvent(eventMessage);
        } else if (eventMessage.msg == "battery_status")
        {
          this.handleBatteryEvent(eventMessage);
        }

      }
      else if (message.kind === "req")
      {
        const requestMessage = message as RequestMessage;
      }
      else if (message.kind === "resp")
      {
        const responseMessage = message as ResponseMessage;
        if (responseMessage.msg === "authentication" && responseMessage.code == 200) {
          this.subscribeEvents(["entity_activity", "entity_media_player", "software_updates",
            "battery_status"]);
        }
      }
    });
    this.mediaPositionTask = timer(0, 1000)
      .pipe(
        map(() => {
          if (this.mediaPosition
            && this.mediaEntity?.new_state?.attributes?.state !== "OFF"
            && this.mediaEntity?.new_state?.attributes?.state !== "PAUSED"
            && this.mediaEntity?.new_state?.attributes?.state !== "STOPPED") {
            this.mediaPosition += 1;
            this.cdr.detectChanges();
          }
          return this.mediaPosition;
        }),
        share()
      ).subscribe();
  }

  updateEntity(message: EventMessage): void {
    const entity = this.mediaEntities.find(item => item.entity_id === message.msg_data.entity_id);
    if (!entity)
    {
      this.mediaEntities.push(message.msg_data);
    }
    else {
      for (const [key, value] of Object.entries(message.msg_data.new_state.attributes))
      {
        if (!entity.new_state) entity.new_state = {};
        if (!entity.new_state.attributes) entity.new_state.attributes = {};
        (entity.new_state.attributes as any)[key] = value;
      }
    }
  }

  handleMediaPlayerEvent(message: EventMessage)
  {
    if (message.msg_data?.new_state?.attributes)
    {
      if (!this.mediaEntity) {
        this.mediaEntity = message.msg_data;
        console.debug("Init media entity", this.mediaEntity);
        if (message.msg_data?.new_state?.attributes?.media_position &&
          message.msg_data.entity_id === this.mediaEntity?.entity_id)
        {
          this.handleMediaTime();
        }
        this.updateEntity(message);
        this.cdr.detectChanges();
        return;
      }
      this.updateEntity(message);
      if (message.msg_data?.new_state?.attributes?.media_image_url) //|| message.msg_data?.new_state?.attributes?.media_title)
      {
        this.mediaEntity = message.msg_data;
        this.cdr.detectChanges();
      } else
      {
        if (this.mediaEntity && message.msg_data?.entity_id == this.mediaEntity.entity_id && message.msg_data.new_state?.attributes)
        {
          for (const [key, value] of Object.entries(message.msg_data.new_state.attributes))
          {
            if (!this.mediaEntity.new_state) this.mediaEntity.new_state = {};
            if (!this.mediaEntity.new_state.attributes) this.mediaEntity.new_state.attributes = {};
            (this.mediaEntity.new_state.attributes as any)[key] = value;
          }
          if (message.msg_data?.new_state?.attributes?.media_position || message.msg_data?.new_state?.attributes?.media_duration)
          {
            this.handleMediaTime();
          }
          this.cdr.detectChanges();
        }
      }
    }
    console.debug("Media entity", this.mediaEntity);
  }

  handleMediaTime()
  {//|| this.mediaEntity.new_state?.attributes?.state !== "PLAYING"
    if (!this.mediaEntity || !this.mediaEntity.new_state?.attributes?.media_position ||
      this.mediaEntity.new_state?.attributes?.state === "OFF")
    {
      if (!this.mediaEntity?.new_state?.attributes?.media_position)
        this.mediaPosition = undefined;
      else
        this.mediaPosition = this.mediaEntity.new_state.attributes.media_position;
      this.cdr.detectChanges();
      return;
    }
    this.mediaPosition = this.mediaEntity.new_state.attributes.media_position;
    this.cdr.detectChanges();
  }

  getMessageEvent(): Subject<Message>
  {
    return this.messageEvent;
  }

  generateNewId(): number {
    const id = this.messageId;
    this.messageId += 1;
    return id;
  }

  subscribeEvents(events: string[])
  {
    this.sendMessage({kind: "req",id: this.generateNewId(), msg: "subscribe_events", msg_data: {
      "channels": events
      }} as RequestMessage)
  }

  private receivedMessage(message: Message)
  {
    console.log("Websocket message", message);
    if (message.kind === "event")
    {
      const eventMessage = message as EventMessage;
      if (eventMessage.msg === "auth_required")
      {
        console.debug("Websocket authentication");
        this.sendMessage({kind: "req", id: this.generateNewId(), msg: "auth",
          msg_data: {token: this.key}} as RequestMessage);
        return;
      }
    }
    else if (message.kind === "req")
    {
      const requestMessage = message as RequestMessage;
    }
    else if (message.kind === "resp")
    {
      const responseMessage = message as ResponseMessage;
    }

    this.messageEvent.next(message);
    this.messageReceived.emit(message);
  }

  sendMessage(message: Message)
  {
    if (!this.websocket) return;
    this.connectionStatus$.pipe(
      filter(status => status),
      tap(() => this.websocket?.next(message)),
      take(1)
    ).subscribe();
  }

  public connect(): void {
    this.initWebsocket();
    this.connectionStatus$.pipe(
      skip(1),
      filter(status => !status),
      tap(() => this.initWebsocket()),
    ).subscribe();
    if (this.remote)
      this.server.getRemoteBattery(this.remote).subscribe(batteryInfo => {
        this.batteryState = batteryInfo;
        this.cdr.detectChanges();
      })
  }

  getMediaInfo(): string | undefined
  {
    if (!this.mediaEntity?.new_state?.attributes) return this.getEntityName(this.mediaEntity);
    const mediaInfo: string[] = [];
    if (this.mediaEntity.new_state.attributes.media_title)
      mediaInfo.push(this.mediaEntity.new_state.attributes.media_title)
    if (this.mediaEntity.new_state.attributes.media_artist)
      mediaInfo.push(this.mediaEntity.new_state.attributes.media_artist)
    if (this.mediaEntity.new_state.attributes.media_album)
      mediaInfo.push(this.mediaEntity.new_state.attributes.media_album);
    return mediaInfo.join(" - ");
  }


  private initWebsocket()
  {
    if (!this.remote) return;
    if (this.websocket) {
      this.websocket.unsubscribe();
      this.websocket = undefined;
    }
    let url = `ws://${this.remote.address}/ws`
    if (this.remote.port)
      url = `ws://${this.remote.address}:${this.remote.port}/ws`;
    this.messageId = 0;
    console.debug("Init websocket", url);
    const openObserver = new Subject<Event>();
    openObserver.subscribe(() => {
      this.status$.next(true);
    });
    const closeObserver = new Subject<CloseEvent>();
    closeObserver.pipe(map((_) => false)).subscribe(this.status$);

    this.websocket = webSocket({url, openObserver, closeObserver});
    this.reconnecInterval = RECONNECT_INTERVAL;
    this.websocket.pipe(retry({
      delay: (errs) => {
        this.status$.next(false);
        console.log(`Websocket connection down, will attempt reconnection in ${this.reconnecInterval}ms`);
        const delay = this.reconnecInterval;
        this.reconnecInterval += 5000;
        return timer(delay);
      }
    })).subscribe({next:message => {
      this.reconnecInterval = RECONNECT_INTERVAL;
      this.receivedMessage(message);
    },
    error: err => {
      console.error("Websocket error", err);
    }});
  }

  protected readonly Math = Math;

  ngOnDestroy(): void {
    if (this.websocket) {
      this.websocket.unsubscribe();
      this.websocket = undefined;
    }
    if (this.mediaPositionTask) {
      this.mediaPositionTask.unsubscribe();
      this.mediaPositionTask = undefined;
    }
  }

  protected readonly Helper = Helper;

  changedMediaEntity($event: any) {
    this.mediaPosition = this.mediaEntity?.new_state?.attributes?.media_position;
    this.cdr.detectChanges();
  }

  private handleBatteryEvent(eventMessage: EventMessage) {
    if (!this.batteryState) {
      this.batteryState = eventMessage.msg_data;
      this.cdr.detectChanges();
      return;
    }
    for (const [key, value] of Object.entries(eventMessage.msg_data))
    {
      (this.batteryState as any)[key] = value;
    }
    this.cdr.detectChanges();
  }
}
