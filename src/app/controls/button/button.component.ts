import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation} from '@angular/core';
import {Button} from "primeng/button";
import {TooltipModule} from "primeng/tooltip";

@Component({
    selector: 'app-button',
    imports: [
        Button,
        TooltipModule
    ],
    templateUrl: './button.component.html',
    styleUrl: './button.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class ButtonComponent {
  @Input() scale = 1;
  @Input() text: string | boolean | undefined;
  @Input() icon: string | undefined;
  @Input() size: "small" | "large" | undefined;
  @Input() tooltip: string | undefined;
  @Input() severity: "success" | "info" | "warn" | "danger" | "help" | "primary" | "secondary" | "contrast" | null | undefined;
  @Output() click: EventEmitter<any> = new EventEmitter();
  @Input() rounded = false;
  @Input() outlined = false;
  @Input() raised = false;
}
