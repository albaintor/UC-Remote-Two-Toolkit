import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Output} from '@angular/core';
import {DialogModule} from "primeng/dialog";
import {ActivityPageCommand, FAFontConfiguration, Remote} from "../../interfaces";
import {ServerService} from "../../server.service";
import {Helper} from "../../helper";
import {NgForOf, NgIf} from "@angular/common";
import {TooltipModule} from "primeng/tooltip";
import {InputTextModule} from "primeng/inputtext";
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-icon-selector',
  standalone: true,
  imports: [
    DialogModule,
    NgForOf,
    TooltipModule,
    InputTextModule,
    FormsModule
  ],
  templateUrl: './icon-selector.component.html',
  styleUrl: './icon-selector.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconSelectorComponent {
  visible = false;
  remote: Remote | undefined;
  customIcons: string[] = [];
  faIcons: FAFontConfiguration[] = [];
  filteredCustomIcons: string[] = [];
  filteredFaIcons: FAFontConfiguration[] = [];
  @Output() iconSelected = new EventEmitter<string>();

  constructor(private server:ServerService, private cdr:ChangeDetectorRef) {
    this.server.getFAIcons().subscribe(icons => {
      this.faIcons = icons;
      this.filteredFaIcons = this.faIcons;
      this.cdr.detectChanges();
    })
  }

  show(remote: Remote): void {
    this.remote = remote;
    this.server.getResources(remote, 'icon').subscribe(resources => {
      this.customIcons = resources;
      this.filteredCustomIcons = this.customIcons;
      this.cdr.detectChanges();
    })
    this.visible = true;
    this.cdr.detectChanges();
  }

  protected readonly Helper = Helper;
  searchIcon = "";

  selectIcon(icon: string): void {
    if (!icon.startsWith("uc:")) icon = "uc:"+icon;
    this.iconSelected.emit(icon);
    this.visible = false;
    this.cdr.detectChanges();
  }

  searchChanges($event: Event) {
    if (this.searchIcon.length > 3) {
      const search = this.searchIcon.toLowerCase();
      this.filteredCustomIcons = this.customIcons.filter(icon => icon.toLowerCase().includes(search));
      this.filteredFaIcons = this.faIcons.filter(icon => icon.label.toLowerCase().includes(search));
    }
    else {
      this.filteredFaIcons = this.faIcons;
      this.filteredCustomIcons = this.customIcons;
    }
    this.cdr.detectChanges();
  }
}
