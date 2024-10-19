import {Injectable, OnDestroy} from '@angular/core';
import {ServerService} from "../server.service";
import {Remote} from "../interfaces";
import {webSocket, WebSocketSubject} from "rxjs/webSocket";
import {BehaviorSubject, delay, Observable, retry, Subject, timer} from "rxjs";
import {distinctUntilChanged, filter, map, skip, take, tap} from "rxjs/operators";
import {Message, RemoteWebsocket} from "./remote-websocket";
import {MediaEntityState, RemoteState, RemoteWebsocketMedia} from "./remote-websocket-media";


const RECONNECT_INTERVAL = 5000;


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
  private mediaWebsocket: RemoteWebsocketMedia | undefined;
  get mediaEntity(): MediaEntityState | undefined {
    return this.mediaWebsocket?.mediaEntity;
  }
  set mediaEntity(mediaEntity: MediaEntityState | undefined) {
    if (this.mediaWebsocket) this.mediaWebsocket.mediaEntity = mediaEntity;
  }

  get mediaEntities(): MediaEntityState[] {
    return this.mediaWebsocket?.mediaEntities ? this.mediaWebsocket?.mediaEntities : [];
  }
  mediaUpdated$ = new BehaviorSubject<MediaEntityState[]>(this.mediaEntities);
  remoteStateUpdated$ = new BehaviorSubject<RemoteState>({});
  mediaPositionUpdated$ = new BehaviorSubject<MediaEntityState[]>([]);

  constructor(private serverService: ServerService) {
    this.init();
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
      if (this.mediaWebsocket) this.mediaWebsocket.destroy();
      this.reset();
      if (websocket) this.mediaWebsocket = new RemoteWebsocketMedia(this.serverService, websocket);
      this.initEvents();
    })
  }

  reset()
  {
    // this._mediaEntities = [];
    // this._mediaEntity = undefined;
    // this.batteryState = undefined;
    if (this.mediaWebsocket) this.mediaUpdated$.next(this.mediaWebsocket.mediaEntities);
  }

  initEvents()
  {
    if (!this.mediaWebsocket) return;
    this.mediaWebsocket.onMediaStateChange().subscribe(state => { this.mediaUpdated$.next(state)});
    this.mediaWebsocket.onRemoteStateChange().subscribe(state => { this.remoteStateUpdated$.next(state)});
    this.mediaWebsocket.onMediaPositionChange().subscribe(state => { this.mediaPositionUpdated$.next(state)});
    this.mediaUpdated$.next(this.mediaWebsocket.mediaEntities);
    this.remoteStateUpdated$.next({batteryInfo: this.mediaWebsocket.batteryState});
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
    if (this.mediaWebsocket) this.mediaWebsocket.destroy();
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

  updateEntity(entity_id: string)
  {
    this.mediaWebsocket?.updateEntity(entity_id);
  }

  getEntityName(mediaEntity:  MediaEntityState | undefined): string
  {
    return this.mediaWebsocket ? this.mediaWebsocket?.getEntityName(mediaEntity) : "";
  }

  getMediaInfo(): string | undefined
  {
    return this.mediaWebsocket?.getMediaInfo();
  }

  getMediaPosition(mediaEntity: MediaEntityState): number {
    return this.mediaWebsocket ? this.mediaWebsocket?.getMediaPosition(mediaEntity) : 0;
  }
}
