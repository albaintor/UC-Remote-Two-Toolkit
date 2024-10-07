import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Output} from '@angular/core';
import {DialogModule} from "primeng/dialog";
import {ActivityPageCommand, Remote} from "../../interfaces";
import {ServerService} from "../../server.service";
import {Helper} from "../../helper";
import {NgForOf, NgIf} from "@angular/common";
import {TooltipModule} from "primeng/tooltip";

@Component({
  selector: 'app-icon-selector',
  standalone: true,
  imports: [
    DialogModule,
    NgIf,
    NgForOf,
    TooltipModule
  ],
  templateUrl: './icon-selector.component.html',
  styleUrl: './icon-selector.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconSelectorComponent {
  visible = false;
  remote: Remote | undefined;
  customIcons: string[] = [];
  ucIcons: {name: string, icon: string}[] = [];
  @Output() iconSelected = new EventEmitter<string>();

  constructor(private server:ServerService, private cdr:ChangeDetectorRef) {
    this.server.getUCIconsMap().subscribe(icons => {
      this.ucIcons = icons;
      this.cdr.detectChanges();
    })
  }

  show(remote: Remote): void {
    this.remote = remote;
    this.server.getResources(remote, 'icon').subscribe(resources => {
      this.customIcons = resources;
      this.cdr.detectChanges();
    })
    this.visible = true;
    this.cdr.detectChanges();
  }

  protected readonly Helper = Helper;

  selectIcon(icon: string): void {
    this.iconSelected.emit(icon);
    this.visible = false;
    this.cdr.detectChanges();
  }
}
