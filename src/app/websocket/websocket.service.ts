import {Injectable, OnDestroy} from '@angular/core';
import {ServerService} from "../server.service";
import {Entity, Remote} from "../interfaces";
import {BehaviorSubject,Observable, Subject} from "rxjs";
import {distinctUntilChanged} from "rxjs/operators";
import {Message, RemoteWebsocket} from "./remote-websocket";
import {
  ActivityState, EntityState, LightEntityState,
  MediaEntityState,
  RemoteState,
  RemoteWebsocketInstance
} from "./remote-websocket-instance";


@Injectable({
  providedIn: 'root'
})
export class WebsocketService implements OnDestroy {
  get remote(): Remote | undefined {
    return this._remote;
  }
  private _remote: Remote | undefined;
  remoteChanged$:BehaviorSubject<Remote | undefined> = new BehaviorSubject<Remote | undefined>(this.remote);
  remoteWebsocket: RemoteWebsocket | undefined;
  remoteWebsocket$ = new BehaviorSubject<RemoteWebsocket|undefined>(undefined);
  status$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  messageEvent$: Subject<Message> = new Subject();
  doConnect = false;
  private websocketInstance: RemoteWebsocketInstance | undefined;
  get mediaEntity(): MediaEntityState | undefined {
    return this.websocketInstance?.mediaEntity;
  }
  set mediaEntity(mediaEntity: MediaEntityState | undefined) {
    if (this.websocketInstance) this.websocketInstance.mediaEntity = mediaEntity;
  }

  get mediaEntities(): MediaEntityState[] {
    return this.websocketInstance?.mediaEntities ? this.websocketInstance?.mediaEntities : [];
  }
  mediaUpdated$ = new BehaviorSubject<MediaEntityState[]>(this.mediaEntities);
  remoteStateUpdated$ = new BehaviorSubject<RemoteState>({});
  mediaPositionUpdated$ = new BehaviorSubject<MediaEntityState[]>([]);
  activityChanged$ = new BehaviorSubject<ActivityState[]>([]);
  lightChanged$ = new BehaviorSubject<LightEntityState[]>([]);

  constructor(private serverService: ServerService) {
    this.init();
  }

  getEntityStates(): EntityState[]
  {
    return this.websocketInstance ? this.websocketInstance?.getEntityStates() : [];
  }

  removeEntityState(entity_id: string)
  {
    if (this.websocketInstance)
    {
      this.websocketInstance.removeEntityState(entity_id);
    }
  }


  get lightEntities(): LightEntityState[] {
    return this.websocketInstance?.lightEntities ? this.websocketInstance?.lightEntities : [];
  }

  init(): void
  {
    this.serverService.remote$.subscribe(remote => {

      if (remote?.address === this.remoteWebsocket?.getRemote()?.address) return;
      if (this.remoteWebsocket) {
        this.remoteWebsocket.destroy();
        delete this.remoteWebsocket;
        this.remoteWebsocket$.next(undefined);
      }
      this._remote = remote;
      this.remoteChanged$.next(remote);
      if (remote) {
        this.serverService.getRemoteKey(remote).subscribe(key => {
          this.remoteWebsocket = new RemoteWebsocket(remote, key);
          if (this.doConnect)
            this.remoteWebsocket.connect();
          this.remoteWebsocket$.next(this.remoteWebsocket);
          this.remoteWebsocket.connectionStatus$.subscribe(status => {
            this.status$.next(status);
          });
          this.remoteWebsocket.getMessageEvent().subscribe(message => {
            this.messageEvent$.next(message);
          })
          this.connect();
        });
      }
    });
    this.remoteWebsocket$.subscribe(websocket => {
      if (this.websocketInstance) this.websocketInstance.destroy();
      this.reset();
      if (websocket) this.websocketInstance = new RemoteWebsocketInstance(this.serverService, websocket);
      this.initEvents();
    })
  }

  reset()
  {
    // this._mediaEntities = [];
    // this._mediaEntity = undefined;
    // this.batteryState = undefined;
    if (this.websocketInstance) this.mediaUpdated$.next(this.websocketInstance.mediaEntities);
  }

  initEvents()
  {
    if (!this.websocketInstance) return;
    this.websocketInstance.onMediaStateChange().subscribe(state => { this.mediaUpdated$.next(state)});
    this.websocketInstance.onRemoteStateChange().subscribe(state => { this.remoteStateUpdated$.next(state)});
    this.websocketInstance.onMediaPositionChange().subscribe(state => { this.mediaPositionUpdated$.next(state)});
    this.mediaUpdated$.next(this.websocketInstance.mediaEntities);
    this.websocketInstance.onActivityChange().subscribe(state => {this.activityChanged$.next(state)});
    this.websocketInstance.onLightChange().subscribe(state => {this.lightChanged$.next(state)});
    this.remoteStateUpdated$.next({batteryInfo: this.websocketInstance.batteryState});
  }

  getWebsocket(): BehaviorSubject<RemoteWebsocket|undefined>
  {
    return this.remoteWebsocket$;
  }

  public get connectionStatus(): Observable<boolean> {
    return this.status$.pipe(distinctUntilChanged());
  }

  public connect(): void {
    this.doConnect = true;
    this.remoteWebsocket?.connect();
  }

  ngOnDestroy(): void {
    if (this.remoteWebsocket) {
      this.remoteWebsocket.destroy();
      delete this.remoteWebsocket;
    }
    if (this.websocketInstance) this.websocketInstance.destroy();
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
    return this.activityChanged$;
  }

  public onLightChange()
  {
    return this.lightChanged$;
  }

  updateEntity(entity: Entity)
  {
    this.websocketInstance?.addEntity(entity.entity_id!, entity.entity_type);
  }

  getEntityName(entityState:  EntityState | undefined): string
  {
    return this.websocketInstance ? this.websocketInstance?.getEntityName(entityState) : "";
  }

  getMediaInfo(): string | undefined
  {
    return this.websocketInstance?.getMediaInfo();
  }

  getMediaPosition(mediaEntity: MediaEntityState): number {
    return this.websocketInstance ? this.websocketInstance?.getMediaPosition(mediaEntity) : 0;
  }
}
