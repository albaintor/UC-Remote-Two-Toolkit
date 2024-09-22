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
import {Button} from "primeng/button";
import {IconComponent} from "../../icon/icon.component";
import {InputNumberModule} from "primeng/inputnumber";
import {NgIf} from "@angular/common";
import {OrderListModule} from "primeng/orderlist";
import {MessageService, PrimeTemplate} from "primeng/api";
import {TooltipModule} from "primeng/tooltip";
import {Activity, Remote, UIPage} from "../../interfaces";
import {ServerService} from "../../server.service";

@Component({
  selector: 'app-activity-page-list',
  standalone: true,
  imports: [
    Button,
    IconComponent,
    InputNumberModule,
    NgIf,
    OrderListModule,
    PrimeTemplate,
    TooltipModule
  ],
  templateUrl: './activity-page-list.component.html',
  styleUrl: './activity-page-list.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ActivityPageListComponent {
  @Input() activity: Activity | undefined;
  @Input() editable = true;
  @Output() onReorder = new EventEmitter<{activity:Activity, page:UIPage}>();
  @Output() onSelectPage = new EventEmitter<{activity:Activity, page:UIPage}>();

    protected readonly Helper = Helper;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) { }

  addPage($event: MouseEvent) {
    if (!this.activity) return;
    if (!this.activity.options) this.activity.options = {};
    if (!this.activity.options.user_interface) this.activity.options.user_interface = { pages: []};
    const newPage: UIPage = {name: "New page", items: [], grid: {width: 4, height: 6}};
    this.activity.options.user_interface.pages?.push(newPage);
    const activity = this.activity;
    this.activity = undefined;
    this.cdr.detectChanges();
    this.activity = activity;
    this.cdr.detectChanges();
    this.onReorder.emit({activity: this.activity!, page: newPage});
  }

  updatePages($event: UIPage) {
    console.log("Reorder pages", $event);
    this.onReorder.emit({activity: this.activity!, page: $event});
  }

  selectPage(page: UIPage) {
    this.onSelectPage.emit({activity: this.activity!, page: page});
  }

  deletePage(page: UIPage) {
    this.activity?.options?.user_interface?.pages?.splice(this.activity?.options?.user_interface?.pages.indexOf(page), 1);
    this.onReorder.emit({activity: this.activity!, page: page});
  }
}
