import {ServerService} from "../server.service";
import {BatteryState, Entity, Remote} from "../interfaces";
import {BehaviorSubject, map, Observable, Observer, share, Subject, Subscription, timer} from "rxjs";
import {Helper} from "../helper";
import {EventMessage, RemoteWebsocket, RequestMessage, ResponseMessage} from "./remote-websocket";

export interface MediaEntityState
{
  remote: Remote;
  entity_id: string;
  entity_type: string;
  event_type: string;
  new_state?: {
    features?: string[];
    attributes?: {
      media_artist?: string;
      media_album?: string;
      media_title?: string;
      media_duration?: number;
      media_position?: number;
      media_image_url?: string;
      media_image_proxy?: boolean;
      media_type?: string;
      source?: string;
      volume?: number;
      state?:  "UNAVAILABLE" | "UNKNOWN" | "ON" | "OFF" | "PLAYING" | "PAUSED" | "STANDBY" | "BUFFERING";
      last_update_time?: number;
      source_list?: string[];
      sound_mode?: string;
      sound_mode_list?: string[];
      muted?: boolean;
    }
  }
}

export interface RemoteState {
  batteryInfo?: BatteryState;
}

export class RemoteWebsocketMedia {
  get mediaEntity(): MediaEntityState | undefined {
    return this._mediaEntity;
  }
  set mediaEntity(mediaEntity: MediaEntityState | undefined) {
    this._mediaEntity = this.mediaEntities.find(item => item.entity_id === mediaEntity?.entity_id);
  }

  get mediaEntities(): MediaEntityState[] {
    return this._mediaEntities;
  }
  private _mediaEntity : MediaEntityState | undefined;
  private _mediaEntities: MediaEntityState[] = [];
  batteryState: BatteryState | undefined;
  private mediaPositionTask: Subscription | undefined;
  entities: Entity[] = [];
  mediaUpdated$ = new BehaviorSubject<MediaEntityState[]>(this.mediaEntities);
  remoteStateUpdated$ = new BehaviorSubject<RemoteState>({});
  mediaPositionUpdated$ = new BehaviorSubject<MediaEntityState[]>([]);

  constructor(private serverService: ServerService, private websocketService: RemoteWebsocket) {
    this.init();
  }

  init(): void {
    this.entities = this.serverService.getCachedEntities();
    this.serverService.entities$.subscribe(entities => {
      this.entities = entities;
      this.mediaUpdated$.next(this.mediaEntities);
    });
    this.initWidget();
  }

  getRemote()
  {
    return this.websocketService.getRemote();
  }

  destroy(): void {
    if (this.mediaPositionTask) {
      this.mediaPositionTask.unsubscribe();
      this.mediaPositionTask = undefined;
    }
  }

  public onRemoteStateChange()
  {
    return this.remoteStateUpdated$;
  }

  public onMediaStateChange()
  {
    return this.mediaUpdated$;
  }

  public onMediaPositionChange()
  {
    return this.mediaPositionUpdated$;
  }

  reset()
  {
    this._mediaEntities = [];
    this._mediaEntity = undefined;
    this.batteryState = undefined;
    this.mediaUpdated$.next(this._mediaEntities);
  }

  initWidget()
  {
    if (!this._mediaEntity && this._mediaEntities?.length > 0) {
      this._mediaEntity = this._mediaEntities[0];
      console.debug("Init media entity", this._mediaEntity);
      this.mediaUpdated$.next([this._mediaEntity!]);
    }
    this.websocketService.getMessageEvent().subscribe(message => {
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
          this.websocketService.subscribeEvents(["entity_activity", "entity_media_player", "software_updates",
            "battery_status"]);
        }
      }
    });
    this.mediaPositionTask = timer(0, 1000)
      .pipe(
        map(() => {
          const entities: MediaEntityState[] = [];
          this._mediaEntities?.forEach(mediaEntity => {
            if (mediaEntity.new_state?.attributes?.media_position)
            {
              if (!mediaEntity.new_state?.attributes?.last_update_time)
              {
                mediaEntity.new_state.attributes.last_update_time = Date.now();
              }
              entities.push(mediaEntity);
            }
          });
          if (!this._mediaEntity && this._mediaEntities?.length > 0) {
            this._mediaEntity = this._mediaEntities[0];
          }
          if (entities.length > 0) this.mediaPositionUpdated$.next(entities);
          return entities;
        }),
        share()
      ).subscribe();
    if (this.websocketService.getRemote())
      this.serverService.getRemoteBattery(this.websocketService.getRemote()!).subscribe(batteryInfo => {
        this.batteryState = batteryInfo;
        this.remoteStateUpdated$.next({batteryInfo: this.batteryState})
      })
  }

  getEntityName(mediaEntity:  MediaEntityState | undefined): string
  {
    if (!mediaEntity) return "";
    const entity = this.entities.find(item => item.entity_id === mediaEntity?.entity_id);
    if (!entity) return mediaEntity.entity_id;
    return Helper.getEntityName(entity);
  }

  checkEntityImage(entity: MediaEntityState, attributes: any)
  {
    if (entity.new_state?.attributes?.media_image_url)
    {
      entity.new_state.attributes.media_image_proxy = entity.new_state.attributes.media_image_url.search(/\.[A-Za-z0-9]+$/) == -1 &&
        !entity.new_state.attributes.media_image_url.startsWith("data:");
    }
    if (!attributes.media_image_url) return;
    if (entity.new_state?.attributes?.media_image_url !== attributes.media_image_url)
    {
      if (!entity.new_state) entity.new_state = {};
      if (!entity.new_state.attributes) entity.new_state.attributes = {};

      entity.new_state.attributes.media_image_proxy = attributes.media_image_url.search(/\.[A-Za-z0-9]+$/) == -1 &&
        !attributes.media_image_url.startsWith("data:");
    }
  }

  updateEntity(entity_id: string)
  {
    if (!this.websocketService.getRemote()) return;
    this.serverService.getRemotetEntity(this.websocketService.getRemote()!, entity_id).subscribe(entity => {
      console.debug("Add new entity for tracking", entity);
      let entityEntry = this._mediaEntities.find(item =>
        item.entity_id === entity.entity_id);
      if (!entityEntry) {
        this._mediaEntities.push({remote: this.getRemote()!, entity_id, entity_type:entity.entity_type, event_type: "", new_state: {...entity}});
        entityEntry = this._mediaEntities.find(item => item.entity_id === entity.entity_id);
      }
      this.fillEntityFields(entityEntry, entity);
      this.mediaUpdated$.next([entityEntry!]);
    });
  }

  updateEntityFromEvent(message: EventMessage): void {
    if (!message.msg_data?.entity_id) return;
    let entity = this._mediaEntities.find(item => item.entity_id === message.msg_data.entity_id);
    if (!entity)
    {
      if (message.msg_data.new_state.attributes.media_position)
        message.msg_data.new_state.attributes.last_update_time = Date.now();
      entity = message.msg_data as MediaEntityState;
      this._mediaEntities.push(entity);
      this.updateEntity(entity.entity_id);
    }
    else {
      this.checkEntityImage(entity, message.msg_data.new_state.attributes);
      for (const [key, value] of Object.entries(message.msg_data.new_state.attributes))
      {
        if (!entity.new_state) entity.new_state = {};
        if (!entity.new_state.attributes) entity.new_state.attributes = {};
        (entity.new_state.attributes as any)[key] = value;
      }
      if (message.msg_data.new_state.attributes.media_position)
      {
        if (!entity.new_state) entity.new_state = {};
        if (!entity.new_state.attributes) entity.new_state.attributes = {};
        entity.new_state.attributes.last_update_time = Date.now();
      }
    }
    this.initEntities();
    console.debug("Media entities", this._mediaEntities);
  }

  initEntities()
  {
    if (this.websocketService.getRemote()) {
      const remote = this.websocketService.getRemote()!;
      this._mediaEntities.forEach(entity => {
          const entityEntry = this._mediaEntities.find(item =>
            item.entity_id === entity.entity_id);
          if (!entityEntry || entityEntry.new_state?.features) return;
          this.serverService.getRemotetEntity(remote, entity.entity_id).subscribe(entity => {
            const entityEntry = this._mediaEntities.find(item =>
              item.entity_id === entity.entity_id);
            this.fillEntityFields(entityEntry, entity);
          })
        }
      )
    }
  }

  handleMediaPlayerEvent(message: EventMessage)
  {
    if (message.msg_data?.new_state?.attributes)
    {
      this.updateEntityFromEvent(message);
      const entity = this._mediaEntities.find(item => item.entity_id === message.msg_data.entity_id);
      if (!this._mediaEntity) {
        this._mediaEntity = entity;
        console.debug("Init media entity", this._mediaEntity);
        this.mediaUpdated$.next([this._mediaEntity!]);
        return;
      }
      if (message.msg_data?.new_state?.attributes?.media_image_url) //|| message.msg_data?.new_state?.attributes?.media_title)
      {
        this._mediaEntity = entity;
        this.mediaUpdated$.next([this._mediaEntity!]);
      }
      else if (entity)
      {
        this.mediaUpdated$.next([entity]);
      }
      console.debug("Updated entity", entity);
    }

  }

  getMediaInfo(): string | undefined
  {
    if (!this._mediaEntity?.new_state?.attributes) return this.getEntityName(this._mediaEntity);
    const mediaInfo: string[] = [];
    if (this._mediaEntity.new_state.attributes.media_title)
      mediaInfo.push(this._mediaEntity.new_state.attributes.media_title)
    if (this._mediaEntity.new_state.attributes.media_artist)
      mediaInfo.push(this._mediaEntity.new_state.attributes.media_artist)
    if (this._mediaEntity.new_state.attributes.media_album)
      mediaInfo.push(this._mediaEntity.new_state.attributes.media_album);
    return mediaInfo.join(" - ");
  }

  private handleBatteryEvent(eventMessage: EventMessage) {
    if (!this.batteryState) {
      this.batteryState = eventMessage.msg_data;
      this.remoteStateUpdated$.next({batteryInfo: this.batteryState})
      return;
    }
    for (const [key, value] of Object.entries(eventMessage.msg_data))
    {
      (this.batteryState as any)[key] = value;
    }
    this.remoteStateUpdated$.next({batteryInfo: this.batteryState})
  }

  getMediaPosition(mediaEntity: MediaEntityState): number {
    if (!mediaEntity.new_state?.attributes?.media_position) return 0;
    if ((mediaEntity.new_state?.attributes?.state &&
        ["UNAVAILABLE", "UNKNOWN", "ON", "OFF", "PAUSED", "STANDBY"].includes(mediaEntity.new_state.attributes.state)) ||
      !mediaEntity.new_state?.attributes?.last_update_time)
    {
      return mediaEntity.new_state.attributes.media_position;
    }
    return Math.floor(mediaEntity.new_state.attributes.media_position + Math.abs(Date.now() - mediaEntity.new_state?.attributes?.last_update_time)/1000);
  }

  private fillEntityFields(entityEntry: MediaEntityState | undefined, entity: Entity) {
    if (entityEntry)
    {
      this.checkEntityImage(entityEntry, entity.attributes);
      for (const [key, value] of Object.entries(entity.attributes))
      {
        if (!entityEntry.new_state) entityEntry.new_state = {};
        if (!entityEntry.new_state.attributes) entityEntry.new_state.attributes = {};
        (entityEntry.new_state.attributes as any)[key] = value;
      }
      for (const [key, value] of Object.entries(entity))
      {
        if (key === "attributes") continue;
        if (!entityEntry.new_state) entityEntry.new_state = {};
        (entityEntry.new_state as any)[key] = value;
      }
    }
  }
}
