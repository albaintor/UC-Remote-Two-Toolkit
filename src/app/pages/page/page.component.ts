import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewEncapsulation
} from '@angular/core';
import {ServerService} from "../../server.service";
import {Entity, Page, PageItem, Profile, ProfileGroup, Remote} from "../../interfaces";
import {Button} from "primeng/button";
import {DialogModule} from "primeng/dialog";
import {IconComponent} from "../../controls/icon/icon.component";
import {InputNumberModule} from "primeng/inputnumber";
import {NgForOf, NgIf} from "@angular/common";
import {OrderListModule} from "primeng/orderlist";
import {ToastModule} from "primeng/toast";
import {TooltipModule} from "primeng/tooltip";
import {Helper} from "../../helper";
import {ExpandableContentComponent} from "../../controls/expandable-content/expandable-content.component";
import {AutoCompleteCompleteEvent, AutoCompleteModule} from "primeng/autocomplete";
import {FormsModule} from "@angular/forms";

@Component({
    selector: 'app-page',
    imports: [
        Button,
        DialogModule,
        IconComponent,
        InputNumberModule,
        NgIf,
        OrderListModule,
        ToastModule,
        TooltipModule,
        NgForOf,
        ExpandableContentComponent,
        AutoCompleteModule,
        FormsModule
    ],
    templateUrl: './page.component.html',
    styleUrl: './page.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class PageComponent implements OnInit {
  @Input() remote: Remote | undefined;
  @Input() profile: Profile | undefined;
  page: Page | undefined;
  @Input("page") set _page(page: Page | undefined) {
    this.page = page;
    if (this.page) this.reorderPage(this.page);
  }
  @Input() editable = true;
  @Output() onUpdate = new EventEmitter<Page>();
  @Output() onDeletePage = new EventEmitter<Page>();
  @Input() entities: Entity[] = [];
  protected readonly Helper = Helper;
  newEntity: Entity | undefined;
  suggestions: Entity[] = [...this.entities];
  showAddPageItem = false;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef) {}

  ngOnInit(): void {
  }

  reorderPage(page: Page)
  {
    page.items?.sort((a, b) => a.pos - b.pos);
  }

  updateItems($event: any) {
    let pos = 1;
    this.page?.items?.forEach(item => {
      item.pos = pos;
      pos++;
    });
    this.onUpdate.emit(this.page);
  }

  getEntity(entityId: string): Entity | undefined
  {
    return this.entities?.find(entity => entity.entity_id === entityId);
  }

  getGroup(groupId: string): ProfileGroup|undefined {
    if (!this.profile) return undefined;
    return this.profile.groups?.find(group => group.group_id === groupId);
  }

  getGroupEntities(groupId: string): (Entity|undefined)[]  {
    if (!this.profile) return [];
    let group = this.profile.groups?.find(group => group.group_id === groupId);
    if (group) return group.entities.map(entityId => this.entities.find(entity => entity.entity_id === entityId));
    return [];
  }

  deleteItem(item: PageItem) {
    const index = this.page?.items?.indexOf(item);
    if (index && index > -1) {
      this.page!.items!.splice(index, 1);
      this.onUpdate.emit(this.page);
      this.cdr.detectChanges();
    }
  }

  addCommand($event: MouseEvent) {
    this.showAddPageItem = true;
    this.cdr.detectChanges();
  }

  deletePage($event: MouseEvent) {
    this.onDeletePage.emit(this.page);
    this.cdr.detectChanges();
  }

  searchEntities($event: AutoCompleteCompleteEvent) {
    if (!$event.query) this.suggestions = [...this.entities];
    this.suggestions = this.entities.filter(entity =>
      Helper.getEntityName(entity).toLowerCase().includes($event.query.toLowerCase()));
  }

  addItem($event: any) {
    if (!this.newEntity || !this.page?.items) return;
    console.debug("Add item", this.newEntity);
    const items = this.page.items;
    this.page.items = [];
    this.cdr.detectChanges();
    this.page.items = items;
    this.page.items.push({entity_id: this.newEntity?.entity_id,
      pos: (this.page.items.length+1)});
    this.showAddPageItem = false;
    this.onUpdate.emit(this.page);
    this.cdr.detectChanges();
  }
}
