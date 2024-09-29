import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation
} from '@angular/core';
import {Helper} from "../../helper";
import {NgIf} from "@angular/common";
import {Entity, EntityIntegration, Remote} from "../../interfaces";

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
  @Input() entity: Entity | undefined;
  @Output() click: EventEmitter<any> = new EventEmitter();

  protected readonly Helper = Helper;
  constructor(private cdr:ChangeDetectorRef) {}


  onClick($event: any) {
    this.click.emit($event);
  }

  hasEntityIcon() : boolean
  {
    return !!(this.entity?.icon && this.entity.icon.length > 0);
  }

  getIntegrationIcon(): string | undefined
  {
    if (this.entity?.integration && typeof this.entity.integration !== "string")
    {
      const integration = this.entity.integration as EntityIntegration;
      if (integration.icon) return integration.icon;
    }
    return undefined;
  }

  replaceImage($event: ErrorEvent) {
    console.log($event);
    const image:HTMLImageElement = <HTMLImageElement>$event.target;
    image.src = 'assets/icons/media_player.svg';
    image.width = image.width * 60/100;
    image.height = image.height * 60/100;
  }
}
