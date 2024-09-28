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
import {ScrollingTextComponent} from "./scrolling-text/scrolling-text.component";
import {DropdownModule} from "primeng/dropdown";
import {FormsModule} from "@angular/forms";
import {MediaEntityState, RemoteState, RemoteWebsocketService} from "./remote-websocket.service";


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
export class RemoteWidgetComponent implements OnInit {
  @Input() visible = true;
  minimized = false;
  remoteState: RemoteState | undefined;
  mediaEntity: MediaEntityState | undefined;
  mediaEntities: MediaEntityState[] = [];

  constructor(private server:ServerService, protected remoteWebsocketService: RemoteWebsocketService, private cdr:ChangeDetectorRef) { }

  ngOnInit(): void {
    this.remoteWebsocketService.onRemoteStateChange().subscribe(remoteState => {
      this.remoteState = remoteState;
      this.cdr.detectChanges();
    })
    this.remoteWebsocketService.onMediaStateChange().subscribe(remoteState => {
      this.mediaEntity = this.remoteWebsocketService.mediaEntity;
      this.mediaEntities = this.remoteWebsocketService.mediaEntities;
      this.cdr.detectChanges();
    })
  }

  changedMediaEntity($event: any) {
    this.remoteWebsocketService.mediaEntity = this.mediaEntity;
  }


  getStatusStyle(state: string) {
    switch(state)
    {
      case "UNAVAILABLE":
      case "UNKNOWN": return "danger";
      case "ON": return "info";
      case "OFF": return "secondary";
      case "PLAYING": return "success";
      case "PAUSED": return "warning";
      case "STANDBY": return "secondary";
      case "BUFFERING":return "success";
      default: return "secondary";
    }
  }

  formatDuration(duration: number): string {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration - (hours * 3600)) / 60);
    const seconds = duration - (hours * 3600) - (minutes * 60);
    return hours.toString().padStart(2, '0') + ':' +
      minutes.toString().padStart(2, '0') + ':' +
      seconds.toString().padStart(2, '0');
  }

  protected readonly Math = Math;


}
