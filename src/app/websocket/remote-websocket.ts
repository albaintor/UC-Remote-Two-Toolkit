import {OnDestroy} from '@angular/core';
import {webSocket, WebSocketSubject} from "rxjs/webSocket";
import {BehaviorSubject, delay, Observable, retry, Subject, timer} from "rxjs";
import {distinctUntilChanged, filter, map, skip, take, tap} from "rxjs/operators";
import {Remote} from "../interfaces";

export interface Message
{
  kind: "req"|"resp"|"event";
  msg_data: any;
}

export interface RequestMessage extends Message {
  kind: "req";
  msg: string;
  id: number;
}

export interface ResponseMessage extends Message {
  kind: "resp";
  code: number;
  msg: string;
  req_id: number;
}

export interface EventMessage extends Message {
  kind: "event";
  msg: string;
}

const RECONNECT_INTERVAL = 5000;

export class RemoteWebsocket  {
  private remote: Remote | undefined;
  private key: string | undefined;
  websocket:  WebSocketSubject<Message> | undefined;
  messageEvent: Subject<Message> = new Subject();
  messageId = 0;
  reconnecInterval = RECONNECT_INTERVAL;
  status$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(remote: Remote, key: string) {
    this.remote = remote;
    this.key = key;
  }

  public getRemote(): Remote | undefined {
    return this.remote;
  }

  public get connectionStatus$(): Observable<boolean> {
    return this.status$.pipe(distinctUntilChanged());
  }

  isRemoteConnected() : boolean
  {
    return this.status$.getValue();
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
    // console.debug("Websocket message", message);
    if (message.kind === "event")
    {
      const eventMessage = message as EventMessage;
      if (eventMessage.msg === "auth_required")
      {
        // console.debug("Websocket authentication");
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
      tap(() => {
        console.debug("Websocket disconnect, reconnecting...");
        this.initWebsocket();
      }),
      delay(this.reconnecInterval)
    ).subscribe();
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

  destroy(): void {
    console.log("Disconnect websocket");
    if (this.websocket) {
      this.websocket.unsubscribe();
      this.websocket = undefined;
    }
  }
}
