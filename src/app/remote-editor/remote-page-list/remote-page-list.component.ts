import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input, OnInit,
  Output,
  ViewEncapsulation
} from '@angular/core';
import {Helper} from "../../helper";
import {Button} from "primeng/button";
import {IconComponent} from "../../controls/icon/icon.component";
import {InputNumberModule} from "primeng/inputnumber";
import {NgIf} from "@angular/common";
import {OrderListModule} from "primeng/orderlist";
import {MessageService, PrimeTemplate} from "primeng/api";
import {TooltipModule} from "primeng/tooltip";
import {Activity, Remote, ScreenLayout, UIPage} from "../../interfaces";
import {ServerService} from "../../server.service";

export enum Operation {
  ReorderPages,
  AddPage,
  DeletePage,
  UpdatePage
}

@Component({
    selector: 'app-remote-page-list',
    imports: [
        Button,
        InputNumberModule,
        NgIf,
        OrderListModule,
        TooltipModule
    ],
    templateUrl: './remote-page-list.component.html',
    styleUrl: './remote-page-list.component.css',
    providers: [MessageService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class RemotePageListComponent implements OnInit {
  remote: Remote | undefined;
  private screenLayout: ScreenLayout | undefined;
  @Input("remote") set _remote(value: Remote | undefined) {
    this.remote = value;
    if (value) {
      this.server.getConfigScreenLayout(value).subscribe(screenLayout => {
        this.screenLayout = screenLayout;
        this.cdr.detectChanges();
      })
    }
  }
  @Input() activity: Activity | undefined;
  @Input() editable = true;
  @Output() onChange = new EventEmitter<{activity:Activity, page:UIPage, operation: Operation}>();
  @Output() onSelectPage = new EventEmitter<{activity:Activity, page:UIPage}>();

  protected readonly Helper = Helper;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) { }

  ngOnInit(): void {
    if (this.remote)
    this.server.getConfigScreenLayout(this.remote).subscribe(screenLayout => {
      this.screenLayout = screenLayout;
      this.cdr.detectChanges();
    })
  }

  addPage($event: MouseEvent) {
    if (!this.activity) return;
    if (!this.activity.options) this.activity.options = {};
    if (!this.activity.options.user_interface) this.activity.options.user_interface = { pages: []};
    const newPage: UIPage = {name: "New page", items: [], grid: {width: 4, height: 6}};
    if (this.screenLayout)
    {
      newPage.grid.width = this.screenLayout.grid.default.width;
      newPage.grid.height = this.screenLayout.grid.default.height;
    }
    this.activity.options.user_interface.pages?.push(newPage);
    const activity = this.activity;
    this.activity = undefined;
    this.cdr.detectChanges();
    this.activity = activity;
    this.cdr.detectChanges();
    this.onChange.emit({activity: this.activity!, page: newPage, operation: Operation.AddPage});
  }

  updatePages($event: UIPage) {
    console.log("Reorder pages", $event);
    this.onChange.emit({activity: this.activity!, page: $event, operation: Operation.UpdatePage});
  }

  selectPage(page: UIPage) {
    this.onSelectPage.emit({activity: this.activity!, page: page});
  }

  deletePage(page: UIPage) {
    this.activity?.options?.user_interface?.pages?.splice(this.activity?.options?.user_interface?.pages.indexOf(page), 1);
    this.onChange.emit({activity: this.activity!, page: page, operation: Operation.DeletePage});
  }
}
