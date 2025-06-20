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
  EntityCommand,
  Remote, RemoteData,
  RemoteModel, RemoteModels, RemoteVersion,
} from "../../interfaces";
import {ServerService} from "../../server.service";
import {ImageMapComponent, MapElement} from "../../controls/image-map/image-map.component";
import {HttpErrorResponse} from "@angular/common/http";
import {MessageService} from "primeng/api";
import {ToastModule} from "primeng/toast";
import {ButtonEditionEvent, ButtonEditorComponent} from "../../activity-editor/button-editor/button-editor.component";
import {IconComponent} from "../../controls/icon/icon.component";
import {Popover, PopoverModule} from "primeng/popover";

export enum ButtonMode {
  ShortPress,
  LongPress,
  DoublePress
}

@Component({
    selector: 'app-remote-buttons',
    imports: [
        TagModule,
        ChipModule,
        TooltipModule,
        NgIf,
        NgForOf,
        ImageMapComponent,
        ToastModule,
        ButtonEditorComponent,
        PopoverModule,
        NgTemplateOutlet
    ],
    templateUrl: './remote-buttons.component.html',
    styleUrl: './remote-buttons.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    providers: [MessageService]
})
export class RemoteButtonsComponent implements AfterViewInit {
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
  @Output() onSelectButton: EventEmitter<{button: ButtonMapping, mode: ButtonMode, severity: "success" | "error",
    error?: string}> = new EventEmitter();
  @Output() onSelectUnassignedButton: EventEmitter<{button: ButtonMapping, mode: ButtonMode}> = new EventEmitter();
  @Input() hideButtonsInfo = false;
  executeButton: ButtonMapping | undefined;
  @ViewChild("executeButtonPanel") executeButtonPanel: Popover | undefined;
  @ViewChild("buttonsInfo", {static: false}) buttonsInfo: ElementRef<HTMLDivElement> | undefined;
  @Output() onChange = new EventEmitter<ButtonEditionEvent>();

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService,) {
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
    this.server.configCommands$.subscribe(config => this.configEntityCommands = config);
  }

  ngAfterViewInit(): void {
  }

  executeCommand(button: ButtonMapping, mode: ButtonMode) {
    const command = (mode === ButtonMode.ShortPress) ? button.short_press : (mode === ButtonMode.LongPress) ? button.long_press : button.double_press;
    if (!this.remote || !command) return;
    console.debug("Execute command", command);
    let execCommand = {...command};
    if (this.activity?.entity_type !== 'activity')
    {
      const internalCommand = this.configEntityCommands?.find(item => item.id === command.cmd_id);
      if (!internalCommand)
      {
        //TODO why is it not possible to get the "default" cmd_id from entity type ?
        if (this.activity?.options?.kind === 'IR')
          execCommand = {entity_id: this.activity!.entity_id!, cmd_id: "remote.send", params: {...command}};
        else
          execCommand = {entity_id: this.activity!.entity_id!, cmd_id: "remote.send_cmd", params: {command: command.cmd_id}};
      }
    }
    console.debug("Execute command", mode, execCommand);
    const updatedButton = {...button};
    if (mode === ButtonMode.ShortPress)
      updatedButton.short_press = execCommand;
    else if (mode === ButtonMode.LongPress)
      updatedButton.long_press = execCommand;
    else
      updatedButton.double_press = execCommand;

    this.server.executeRemotetCommand(this.remote, execCommand).subscribe({next: results => {
      this.onSelectButton.emit({button: updatedButton, mode, severity: "success"});
        // this.messageService.add({key: "activityButtons", summary: "Command executed",
        //   severity: "success", detail: `Results : ${results.code} : ${results.message}`});
      }, error: (err: HttpErrorResponse) => {
        console.error("Error command", err);
        this.onSelectButton.emit({button: updatedButton, mode, severity: "error", error: `${err.error.name} (${err.status} ${err.statusText})`});
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

  selectButton($event: MapElement, longPress = false) {
    if (!$event.tag) return;
    const buttonId = $event.tag;
    const selectedButton = this.buttonsMap[buttonId];
    const button = this.activity?.options?.button_mapping?.find(button => button.button === this.buttonsMap[buttonId]);
    if (!this.editMode)
    {
      if (longPress)
      {
        if (button?.long_press) {
          this.executeCommand(button, ButtonMode.LongPress);
        }
        else if (button?.double_press) {
          this.executeCommand(button, ButtonMode.DoublePress);
        }
        else if (button?.short_press) {
          this.executeCommand(button, ButtonMode.ShortPress);
        }
      }
      else {
        if (button?.short_press) {
          this.executeCommand(button, ButtonMode.ShortPress);
        }
        else if (button?.long_press) {
          this.executeCommand(button, ButtonMode.LongPress);
        }
        else if (button?.double_press) {
          this.executeCommand(button, ButtonMode.DoublePress);
        }
      }
      if (!button?.long_press && !button?.short_press && !button?.double_press) {
        this.onSelectUnassignedButton.emit({button: {button: selectedButton}, mode: ButtonMode.ShortPress});
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
    if (this.buttonsInfo?.nativeElement) {
      this.buttonsInfo.nativeElement.style.width = '400px';
      this.buttonsInfo.nativeElement.style.height = '150px';
    }
    $event.event.stopPropagation();
    this.cdr.detectChanges();
  }

  buttonChanged($event: ButtonEditionEvent) {
    this.updateButtons();
    this.onChange.emit($event);
    this.cdr.detectChanges();
  }

  protected readonly ButtonMode = ButtonMode;
}
