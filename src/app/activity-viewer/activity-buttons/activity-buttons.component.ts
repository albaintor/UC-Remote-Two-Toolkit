import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, ElementRef, EventEmitter,
  Input, Output, ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {Helper} from "../../helper";
import {TagModule} from "primeng/tag";
import {ChipModule} from "primeng/chip";
import {TooltipModule} from "primeng/tooltip";
import {NgForOf, NgIf, NgTemplateOutlet} from "@angular/common";
import {
  Activity,
  ButtonMapping,
  Command,
  EntityCommand,
  EntityCommandParameter,
  Remote, RemoteData,
  RemoteModel, RemoteModels, RemoteVersion,
  ScreenLayout
} from "../../interfaces";
import {ServerService} from "../../server.service";
import {ImageMapComponent, MapElement} from "../../image-map/image-map.component";
import {HttpErrorResponse} from "@angular/common/http";
import {MessageService} from "primeng/api";
import {ToastModule} from "primeng/toast";
import {ButtonEditorComponent} from "../../activity-editor/button-editor/button-editor.component";
import {MediaEntityState} from "../../remote-widget/remote-websocket.service";
import {IconComponent} from "../../controls/icon/icon.component";
import {OverlayPanel, OverlayPanelModule} from "primeng/overlaypanel";

@Component({
  selector: 'app-activity-buttons',
  standalone: true,
  imports: [
    TagModule,
    ChipModule,
    TooltipModule,
    NgIf,
    NgForOf,
    ImageMapComponent,
    ToastModule,
    ButtonEditorComponent,
    IconComponent,
    OverlayPanelModule,
    NgTemplateOutlet
  ],
  templateUrl: './activity-buttons.component.html',
  styleUrl: './activity-buttons.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService]
})
export class ActivityButtonsComponent implements AfterViewInit {
  remote: Remote | undefined;
  @Input("remote") set _remote(value: Remote | undefined) {
    this.remote = value;
    if (value) {
      this.updateButtons();
      this.server.getConfigEntityCommands(value).subscribe(entityCommands => {
        this.configEntityCommands = entityCommands;
        this.cdr.detectChanges();
      });
      this.server.getRemoteVersion(value).subscribe(version => {
        this.version = version;
        this.updateButtons();
        this.cdr.detectChanges();
      });
    }
  }
  activity: Activity | undefined;
  @Input("activity") set _activity(activity: Activity | undefined) {
    this.activity = activity;
    this.updateButtons();
  }
  @Input() editMode = false;
  @Input() scale: number = 1;
  @ViewChild(ButtonEditorComponent) buttonEditor:ButtonEditorComponent | undefined;
  protected readonly Helper = Helper;
  configEntityCommands: EntityCommand[] | undefined;
  mouseOverButtonName: string = "";
  mouseoverButton: ButtonMapping | undefined;
  selectedButton: ButtonMapping | undefined;
  remoteModels: RemoteModels | undefined;
  version: RemoteVersion | undefined;
  buttonsMap:{ [id: string]: string } = {};
  reversedButtonMap:{ [id: string]: string } = {};
  mappedButtons: string[] | undefined;
  @Output() onSelectButton: EventEmitter<ButtonMapping> = new EventEmitter();
  @Input() hideButtonsInfo = false;
  executeButton: ButtonMapping | undefined;
  @ViewChild("executeButtonPanel") executeButtonPanel: OverlayPanel | undefined;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService,) {
    const data = localStorage.getItem("remoteData");
    if (data) {
      const remoteData: RemoteData = JSON.parse(data);
      if (remoteData.configCommands)
        this.configEntityCommands = remoteData.configCommands;
    }
    this.server.getRemoteModels().subscribe(remoteModels => {
      this.remoteModels = remoteModels;
      this.updateButtons();
      this.cdr.detectChanges();
    })
    this.server.getPictureRemoteMap().subscribe(buttonsMap => {
      this.buttonsMap = buttonsMap;
      this.reversedButtonMap = Object.fromEntries(Object.entries(buttonsMap).map(([key, value]) => [value, key]));
      this.updateButtons();
      this.cdr.detectChanges();
    })
  }

  ngAfterViewInit(): void {
  }

  executeCommand(command: Command) {
    if (!this.remote) return;
    this.server.executeRemotetCommand(this.remote, command).subscribe({next: results => {
        // this.messageService.add({key: "activityButtons", summary: "Command executed",
        //   severity: "success", detail: `Results : ${results.code} : ${results.message}`});
      }, error: (err: HttpErrorResponse) => {
        console.error("Error command", err);
        this.messageService.add({key: "activityButtons", summary: "Error executing command",
          severity: "error", detail: `Results : ${err.error.name} (${err.status} ${err.statusText})`});
      }});
    this.cdr.detectChanges();
  }

  updateButtons()
  {
    if (Object.keys(this.reversedButtonMap).length === 0|| !this.activity?.options?.button_mapping) return;
    const selectedButtons = this.activity.options.button_mapping.filter(item => item.long_press
      || item.short_press || item.double_press)
      .map(item => item.button);
    this.mappedButtons = selectedButtons?.map(button => this.reversedButtonMap[button])?.filter(item => item !== undefined);
    this.cdr.detectChanges();
  }

  selectButton($event: MapElement) {
    if (!$event.tag) return;
    const buttonId = $event.tag;
    const button = this.activity?.options?.button_mapping?.find(button => button.button === this.buttonsMap[buttonId]);
    if (!this.editMode && button?.short_press)
    {//executeButtonPanel
      const commands = (button?.short_press ? 1 : 0) + (button?.long_press ? 1 : 0) + (button?.double_press ? 1 : 0);
      if (commands == 1)
        this.executeCommand(button.short_press);
      else if (commands > 1)
      {
        this.executeButton = button;
        this.executeButtonPanel?.show($event.event, $event.event.target);
        this.cdr.detectChanges();
      }
      return;
    }
    this.selectedButton = button;

    this.cdr.detectChanges();
    this.buttonEditor?.show();
    this.cdr.detectChanges();
  }

  getEntityName(entityId: string): string
  {
    const entity = this.activity?.options?.included_entities?.find(entity => entity.entity_id === entityId);
    if (entity) return Helper.getEntityName(entity);
    return entityId;
  }

  getRemoteModel(): RemoteModel | undefined
  {
    if (!this.remoteModels || !this.version) return undefined;
    return this.remoteModels.models.find(model => model.model === this.version?.model);
  }

  buttonOver($event: MapElement) {
    const buttonId = $event.tag;
    if (!buttonId) return;
    this.mouseOverButtonName = this.buttonsMap[buttonId];
    this.mouseoverButton = this.activity?.options?.button_mapping?.find(button => button.button === this.mouseOverButtonName);
    $event.event.stopPropagation();
    this.cdr.detectChanges();
  }

  buttonChanged($event: ButtonMapping) {
    this.updateButtons();
    this.cdr.detectChanges();
  }
}
