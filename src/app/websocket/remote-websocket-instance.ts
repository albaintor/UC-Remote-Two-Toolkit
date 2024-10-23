import {ServerService} from "../server.service";
import {BatteryState, Entity, Remote, Activity} from "../interfaces";
import {BehaviorSubject, map, share, Subject, Subscription, timer} from "rxjs";
import {Helper} from "../helper";
import {EventMessage, RemoteWebsocket, RequestMessage, ResponseMessage} from "./remote-websocket";

export interface EntityState {
  remote: Remote;
  entity_id: string;
  entity_type: string;
  event_type: string;
  new_state?: any;
}

export interface MediaEntityState extends EntityState
{
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

export interface ActivityState extends Activity {
  remote: Remote;
  attributes?: {
    state?: string;
    step?: any;
    timeout?: number;
    total_steps?: number;
    enabled?: boolean;
  };
  ignore_errors?: boolean;
  skip_missing_entities?: boolean;
}

export interface LightEntityState extends EntityState {
  new_state?: {
    attributes?: {
      brightness?: number;
      hue?: number;
      saturation?: number;
      color_temperature?: number;
      state?: string;
    }
    features?: string[];
  }
}

export interface CoverEntityState extends EntityState {
  new_state?: {
    attributes?: any;
    features?: string[];
  }
}

export interface RemoteState {
  batteryInfo?: BatteryState;
}

export class RemoteWebsocketInstance {
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
  private _activities: ActivityState[] = [];
  batteryState: BatteryState | undefined;
  private mediaPositionTask: Subscription | undefined;
  entities: Entity[] = [];
  mediaUpdated$ = new BehaviorSubject<MediaEntityState[]>(this.mediaEntities);
  remoteStateUpdated$ = new BehaviorSubject<RemoteState>({});
  mediaPositionUpdated$ = new BehaviorSubject<MediaEntityState[]>([]);
  private _lightEntities: LightEntityState[] = [];
  lightEntitiesUpdated$ = new BehaviorSubject<LightEntityState[]>([]);
  private _coverEntities: CoverEntityState[] = [];
  coverEntitiesUpdated$ = new BehaviorSubject<CoverEntityState[]>([]);
  activityEntitiesUpdated$ = new BehaviorSubject<ActivityState[]>([]);

  constructor(private serverService: ServerService, private remoteWebsocket: RemoteWebsocket) {
    this.init();
  }

  get lightEntities(): LightEntityState[] {
    return this._lightEntities;
  }

  init(): void {
    this.entities = this.serverService.getCachedEntities();
    this.serverService.entities$.subscribe(entities => {
      this.entities = entities;
      this.mediaUpdated$.next(this.mediaEntities);
    });
    this.subscribeEvents();
  }

  getRemote()
  {
    return this.remoteWebsocket.getRemote();
  }

  destroy(): void {
    if (this.mediaPositionTask) {
      this.mediaPositionTask.unsubscribe();
      this.mediaPositionTask = undefined;
    }
  }

  getEntityStates(): EntityState[]
  {
    return [...this._mediaEntities, ...this._lightEntities];
  }

  removeEntityState(entityId: string): void
  {
    const item = this.getEntityStates().find(item => item.entity_id === entityId);
    if (item) {
      this.getEntityStates().splice(this.getEntityStates().indexOf(item), 1);
      switch(item.entity_type)
      {
        case "media_player": this.mediaUpdated$.next(this._mediaEntities);break;
        case "light": this.lightEntitiesUpdated$.next(this._lightEntities);break;
        case "cover": this.coverEntitiesUpdated$.next(this._coverEntities);break;
        default: console.warn("Not supported entity", entityId);
      }
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

  public onActivityChange()
  {
    return this.activityEntitiesUpdated$;
  }

  public onLightChange()
  {
    return this.lightEntitiesUpdated$;
  }

  public onCoverChange()
  {
    return this.coverEntitiesUpdated$;
  }

  reset()
  {
    this._mediaEntities = [];
    this._mediaEntity = undefined;
    this.batteryState = undefined;
    this.mediaUpdated$.next(this._mediaEntities);
  }

  subscribeEvents()
  {
    if (!this._mediaEntity && this._mediaEntities?.length > 0) {
      this._mediaEntity = this._mediaEntities[0];
      console.debug("Init media entities", this._mediaEntity);
      this.mediaUpdated$.next([this._mediaEntity!]);
    }
    this.remoteWebsocket.getMessageEvent().subscribe(message => {
      if (message.kind === "event")
      {
        const eventMessage = message as EventMessage;
        if (eventMessage.msg == "entity_change")
        {
          switch(eventMessage.msg_data?.entity_type) {
            case "activity": this.handleActivityEvent(eventMessage); break;
            case "media_player": this.handleMediaPlayerEvent(eventMessage); break;
            case "light": this.handleLightEvent(eventMessage); break;
            case "cover": this.handleCoverEvent(eventMessage); break;
            default: console.debug("Unhandled entity event message", message);
          }
        }
        else if (eventMessage.msg == "battery_status")
        {
          this.handleBatteryEvent(eventMessage);
        }
        else {
          console.debug("Unhandled message", message);
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
          this.remoteWebsocket.subscribeEvents(["entity_activity", "entity_media_player", "software_updates",
            "battery_status", "entity_climate", "entity_cover", "entity_light", "entity_sensor"]);
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
    if (this.remoteWebsocket.getRemote())
      this.serverService.getRemoteBattery(this.remoteWebsocket.getRemote()!).subscribe(batteryInfo => {
        this.batteryState = batteryInfo;
        this.remoteStateUpdated$.next({batteryInfo: this.batteryState})
      })
  }

  getEntityName(entityState:  EntityState | undefined): string
  {
    if (!entityState) return "";
    const entity = this.entities.find(item => item.entity_id === entityState?.entity_id);
    if (!entity) return entityState.entity_id;
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

  addEntity(entity_id: string, entity_type: string)
  {
    switch(entity_type)
    {
      case 'media_player':this.updateEntity(entity_id, this._mediaEntities, this.mediaUpdated$);break;
      case 'light': this.updateEntity(entity_id, this._lightEntities, this.lightEntitiesUpdated$);break;
      case 'cover': this.updateEntity(entity_id, this._coverEntities, this.coverEntitiesUpdated$);break;
      default: console.warn("Unsupported entity", entity_type);
    }
  }

  updateEntity(entity_id: string, entityStates: EntityState[], entitySubject: Subject<EntityState[]>)
  {
    if (!this.remoteWebsocket.getRemote()) return;
    this.serverService.getRemotetEntity(this.remoteWebsocket.getRemote()!, entity_id).subscribe(entity => {
      console.debug("Add new entity for tracking", entity);
      let entityEntry = entityStates.find(item =>
        item.entity_id === entity.entity_id);
      if (!entityEntry) {
        entityStates.push({remote: this.getRemote()!, entity_id, entity_type:entity.entity_type, event_type: "", new_state: {...entity}});
        entityEntry = entityStates.find(item => item.entity_id === entity.entity_id);
      }
      this.fillEntityFields(entityEntry, entity);
      entitySubject.next([entityEntry!]);
    });
  }

  updateActivity(entity_id: string, activityStates: ActivityState[], activities: Subject<ActivityState[]>)
  {
    if (!this.remoteWebsocket.getRemote()) return;
    this.serverService.getRemoteActivity(this.remoteWebsocket.getRemote()!, entity_id).subscribe(activity => {
      console.debug("Add new activity for tracking", activity);
      let entityEntry = activityStates.find(item =>
        item.entity_id === activity.entity_id);
      if (entityEntry == undefined) {
        activityStates.push({remote: this.getRemote()!, ...activity});
        entityEntry = activityStates.find(item => item.entity_id === activity.entity_id);
      }
      else {
        activityStates[activityStates.indexOf(entityEntry)] = {remote: this.remoteWebsocket.getRemote()!, ...activity};
      }
      // this.fillEntityFields(entityEntry, activity);
      activities.next([entityEntry!]);
    });
  }


  updateMediaEntityFromEvent(message: EventMessage): void {
    if (!message.msg_data?.entity_id) return;
    let entity = this._mediaEntities.find(item => item.entity_id === message.msg_data.entity_id);
    if (!entity)
    {
      if (message.msg_data.new_state.attributes.media_position)
        message.msg_data.new_state.attributes.last_update_time = Date.now();
      entity = message.msg_data as MediaEntityState;
      this._mediaEntities.push(entity);
      this.updateEntity(entity.entity_id, this.mediaEntities, this.mediaUpdated$);
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
      this.mediaUpdated$.next([entity]);
    }
    console.debug("Media entities", this._mediaEntities);
  }

  handleMediaPlayerEvent(message: EventMessage)
  {
    if (message.msg_data?.new_state?.attributes)
    {
      this.updateMediaEntityFromEvent(message);
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

  updateEntityState(message: EventMessage, entityStates: EntityState[], entityStateUpdater: Subject<EntityState[]>)
  {
    let entity = entityStates.find(item => item.entity_id === message.msg_data.entity_id);
    if (!entity)
    {
      entity = message.msg_data as EntityState;
      entityStates.push(entity);
      this.updateEntity(entity.entity_id, entityStates, entityStateUpdater);
    }
    else {
      for (const [key, value] of Object.entries(message.msg_data.new_state.attributes))
      {
        if (!entity.new_state) entity.new_state = {};
        if (!entity.new_state.attributes) entity.new_state.attributes = {};
        (entity.new_state.attributes as any)[key] = value;
      }
      entityStateUpdater.next([entity]);
    }
  }

  updateActivityState(message: EventMessage, activityStates: ActivityState[], activityStateUpdater: Subject<ActivityState[]>)
  {
    let activityState = activityStates.find(item => item.entity_id === message.msg_data.entity_id);
    if (!activityState)
    {
      activityState = message.msg_data;
      activityStates.push(activityState as any);
      this.updateActivity(message.msg_data.entity_id, activityStates, activityStateUpdater);
    }
    else {
      for (const [key, value] of Object.entries(message.msg_data.new_state.attributes))
      {
        if (!activityState.attributes) activityState.attributes = {};
        (activityState.attributes as any)[key] = value;
      }
      activityStateUpdater.next([activityState]);
    }
  }

  private handleActivityEvent(eventMessage: EventMessage) {
    console.debug("Updated activity event", eventMessage);
    this.updateActivityState(eventMessage, this._activities, this.activityEntitiesUpdated$);

    let entity = this._activities.find(item => item.entity_id === eventMessage.msg_data.entity_id);
    if (entity) {
      Object.assign(entity, eventMessage.msg_data);
      this.activityEntitiesUpdated$.next([entity]);
    }
    else {
      this._activities.push(eventMessage.msg_data);
      this.activityEntitiesUpdated$.next([eventMessage.msg_data]);
    }
  }

  private handleLightEvent(eventMessage: EventMessage) {
    this.updateEntityState(eventMessage, this._lightEntities, this.lightEntitiesUpdated$);
    console.debug("Updated light entity", this._lightEntities);
  }

  private handleCoverEvent(eventMessage: EventMessage) {
    this.updateEntityState(eventMessage, this._coverEntities, this.coverEntitiesUpdated$);
    console.debug("Updated cover entity", this._coverEntities);
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

  private fillEntityFields(entityEntry: EntityState | undefined, entity: Entity | Activity) {
    if (entityEntry !== undefined)
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
