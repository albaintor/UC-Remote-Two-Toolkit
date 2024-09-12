import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation
} from '@angular/core';
import {
  Activity,
  ButtonMapping,
  Remote,
} from "../../interfaces";
import {ButtonModule} from "primeng/button";
import {DialogModule} from "primeng/dialog";
import {DropdownModule} from "primeng/dropdown";
import {IconSelectorComponent} from "../../icon-selector/icon-selector.component";
import {InputNumberModule} from "primeng/inputnumber";
import {InputTextModule} from "primeng/inputtext";
import {NgIf} from "@angular/common";
import {PaginatorModule} from "primeng/paginator";
import {SelectButtonModule} from "primeng/selectbutton";
import {MessageService, SharedModule} from "primeng/api";
import {ToastModule} from "primeng/toast";
import {ServerService} from "../../server.service";
import {Helper} from "../../helper";
import {CommandEditorComponent} from "../command-editor/command-editor.component";

@Component({
  selector: 'app-button-editor',
  standalone: true,
  imports: [
    ButtonModule,
    DialogModule,
    DropdownModule,
    IconSelectorComponent,
    InputNumberModule,
    InputTextModule,
    NgIf,
    PaginatorModule,
    SelectButtonModule,
    SharedModule,
    ToastModule,
    CommandEditorComponent
  ],
  templateUrl: './button-editor.component.html',
  styleUrl: './button-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ButtonEditorComponent {
  // @Input() items: HTMLElement[];
  @Input() button: ButtonMapping | undefined;
  @Input() remote: Remote | undefined;
  @Input() activity: Activity | undefined;
  @Output() buttonChanged = new EventEmitter<ButtonMapping>();
  visible = false;
  backupCommand : ButtonMapping | undefined;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
  }

  updateCommand() {
    this.buttonChanged.emit(this.button);
    this.cdr.detectChanges();
  }

  show(): void {
    console.debug("Editing command", this.button);
    if (this.button)
      this.backupCommand = JSON.parse(JSON.stringify(this.button));
    this.visible = true;
    this.cdr.detectChanges();
  }

  undoChanges($event: MouseEvent) {
    if (!this.backupCommand) return;
    this.button = this.backupCommand;
    this.backupCommand = JSON.parse(JSON.stringify(this.button));
    this.buttonChanged.emit(this.button);
  }

  deleteCommand()
  {
    delete this.button?.long_press;
    delete this.button?.short_press;
    delete this.button?.double_press;
    this.cdr.detectChanges();
    this.buttonChanged.emit(this.button);
  }

  protected readonly Helper = Helper;

  assignShortPress() {
    this.button!.short_press = {} as any;
    this.cdr.detectChanges();
    this.buttonChanged.emit(this.button);
  }

  assignLongPress() {
    this.button!.long_press = {} as any;
    this.cdr.detectChanges();
    this.buttonChanged.emit(this.button);
  }

  assignDoublePress() {
    this.button!.double_press = {} as any;
    this.cdr.detectChanges();
    this.buttonChanged.emit(this.button);
  }

  removeElement(object: any, element: string) {
    delete object[element];
    this.cdr.detectChanges();
    this.buttonChanged.emit(this.button);
  }
}
