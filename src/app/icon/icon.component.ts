import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation
} from '@angular/core';
import {Helper} from "../helper";
import {NgIf} from "@angular/common";
import {Remote} from "../interfaces";

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [
    NgIf
  ],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class IconComponent {
  @Input() remote: Remote | undefined;
  @Input() icon: string | undefined;
  @Input() size: number = 30;
  @Input() fontSize: number = 35;
  @Output() click: EventEmitter<any> = new EventEmitter();

  protected readonly Helper = Helper;
  constructor(private cdr:ChangeDetectorRef) {}

  onClick($event: any) {
    this.click.emit($event);
  }
}
