import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  Pipe,
  PipeTransform,
  QueryList,
  ViewChild,
  ViewChildren,
  ViewEncapsulation
} from '@angular/core';
import {Helper} from "../../helper";
import {ActivityGridItemComponent} from "../activity-grid-item/activity-grid-item.component";
import {ChipModule} from "primeng/chip";
import {NgForOf, NgIf} from "@angular/common";
import {TagModule} from "primeng/tag";
import {Activity, ActivityPageCommand, Command, EntityCommand, Remote, ScreenLayout, UIPage} from "../../interfaces";
import {UiCommandEditorComponent} from "../../activity-editor/ui-command-editor/ui-command-editor.component";
import {HttpErrorResponse} from "@angular/common/http";
import {ServerService} from "../../server.service";
import {MessageService} from "primeng/api";
import {ToastModule} from "primeng/toast";
import {ActivityMediaEntityComponent} from "../actiivty-media-entity/activity-media-entity.component";
import {ButtonMode} from "../activity-buttons/activity-buttons.component";


interface SwipeInfo
{
  mousePressed: boolean;
  initialUiContainerPosition: number;
  uiContainerPosition: number;
  uiClientX: number;
}

@Pipe({name: 'as', standalone: true, pure: true})
export class AsPipe implements PipeTransform {
  transform<T>(input: unknown, baseItem: T | undefined): T {
    return (input as unknown) as T;
  }
}
@Component({
  selector: 'app-activity-grid',
  standalone: true,
  imports: [
    ActivityGridItemComponent,
    AsPipe,
    ChipModule,
    NgForOf,
    NgIf,
    TagModule,
    UiCommandEditorComponent,
    ToastModule,
    ActivityMediaEntityComponent,
  ],
  templateUrl: './activity-grid.component.html',
  styleUrl: './activity-grid.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService]
})
export class ActivityGridComponent implements AfterViewInit {
  currentPage: UIPage | undefined;
  activity: Activity | undefined;

  @Input("activity") set _activity(activity: Activity | undefined)
  {
    this.activity = activity;
    if (!this.currentPage && this.activity?.options?.user_interface?.pages)
      this.currentPage = this.activity?.options?.user_interface?.pages?.[0];
    this.cdr.detectChanges();
  }
  @Input("currentPage") set _currentPage( currentPage: UIPage | undefined)
  {
    this.currentPage = currentPage;
    if (currentPage)
    {
      const index = this.activity?.options?.user_interface?.pages?.indexOf(currentPage);
      if (this.uiCollection?.nativeElement && index && index >= 0)
        this.uiCollection.nativeElement.setAttribute("style", `transform: translate3d(-${index*100}%, 0px, 0px`);
      else if (this.uiCollection?.nativeElement)
        this.uiCollection.nativeElement.setAttribute("style", `transform: translate3d(0%, 0px, 0px`);
    }
    // this.gridCommands = this.getGridItems();
    this.cdr.detectChanges();
  }
  @Input() remote: Remote | undefined;
  width = 4*185;
  widthInit = this.width;
  @Input("width") set _width(width: number) {
    this.width = width;
    this.widthInit = width;
  }
  height = 6*185;
  heightInit = this.height;
  @Input("height") set _height(height: number) {
    this.height = height;
    this.heightInit = height;
  }
  @Input() editMode = false;
  @Input() selectionMode = false;
  runMode = false;
  @Input("runMode") set _runMode(runMode: boolean)
  {
    this.runMode = runMode;
    if (this.runMode)
      this.uiCollection?.nativeElement.classList.add("swipe");
    else
      this.uiCollection?.nativeElement.classList.remove("swipe");
    this.cdr.detectChanges();
  }
  fitScreen = false;
  @Input("fitScreen") set _fitScreen (fitScreen: boolean)
  {
    this.fitScreen = fitScreen;
    this.cdr.detectChanges();
  }
  // gridCommands: ActivityPageCommand[] = [];
  gridItemSource: ActivityGridItemComponent | undefined;
  gridItem: ActivityGridItemComponent | undefined;
  selection: ActivityGridItemComponent[] = [];
  @ViewChild("commandeditor", {static: false}) commandeditor: UiCommandEditorComponent | undefined;
  @ViewChild("uiCollection", {static: false}) uiCollection: ElementRef<HTMLDivElement> | undefined;
  @ViewChildren(ActivityGridItemComponent) gridButtons:QueryList<ActivityGridItemComponent> | undefined;
  @Output() onSelectButton: EventEmitter<{command: Command, mode: ButtonMode, severity: "success" | "error",
    error?: string}> = new EventEmitter();

  configEntityCommands: EntityCommand[] | undefined;
  public Command!: Command;
  protected readonly Helper = Helper;
  screenLayout: ScreenLayout | undefined;
  swipeInfo: SwipeInfo = {
    uiClientX: 0,
    uiContainerPosition: 0,
    mousePressed: false,
    initialUiContainerPosition: 0
  }
  @Output() onPageChange = new EventEmitter<number>();
  swipeAcceleration = 2;


  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
  }

  ngAfterViewInit(): void {
    if (this.fitScreen) {
      this.width = window.innerWidth - 35;
      this.height = (window.innerWidth - 35)*500/400;
    }
    else {
      this.width = Math.min(window.innerWidth * 0.8, this.widthInit);
      this.height = Math.min(window.innerHeight * 1.2, this.heightInit)
    }
    this.server.configCommands$.subscribe(entityCommands => {
      this.configEntityCommands = entityCommands;
      this.cdr.detectChanges();
    })
    if (this.remote && (!this.configEntityCommands || this.configEntityCommands.length == 0))
    {
      this.server.getConfigEntityCommands(this.remote).subscribe(entityCommands => {
        this.configEntityCommands = entityCommands;
        this.cdr.detectChanges();
      });
      this.server.getConfigScreenLayout(this.remote).subscribe(screenLayout => {
        this.screenLayout = screenLayout;
        this.cdr.detectChanges();
      });
    }
    console.log("WIDTH", this.width);
  }

  @HostListener('window:resize', ['$event'])
  onResize($event: any) {
    if (this.fitScreen) {
      this.width = window.innerWidth - 35;
      this.height = (window.innerWidth - 35)*500/400;
    }
    else {
      this.width = Math.min(window.innerWidth * 0.8, this.widthInit);
      this.height = Math.min(window.innerHeight * 1.2, this.heightInit)
    }
    console.log("WIDTH2", this.width);
    this.cdr.detectChanges();
  }

  updateCurrentPage()
  {
    this.getGridPageItems(this.currentPage, true);
    this.cdr.detectChanges();
  }

  getGridPageItems(page: UIPage | undefined, reset=false): ActivityPageCommand[]
  {
    if (!page) return [];
    const modifiedPage = page as any;
    if (reset || !modifiedPage?.gridCommands)
    {
      const list: ActivityPageCommand[] = [];
      for (let y=0; y<page?.grid.height!;y++)
      {
        for (let x=0; x<page?.grid.width!;x++)
        {
          const item = page?.items.find(item => item.location.x == x && item.location.y == y);
          if (item == null)
          {
            if (!Helper.findItem(list, x, y)) list.push({type: "text", location:{x, y}, size: {width: 1, height: 1}});
          }
          else {
            list.push(item);
          }
        }
      }
      modifiedPage.gridCommands = list;
      return list;
    }
    else return modifiedPage.gridCommands;
  }

  getEntityName(entityId: string | undefined): string
  {
    if (!entityId) return "";
    const entity = this.server.getCachedEntities().find(entity => entity.entity_id === entityId);
    if (entity?.name)
      return Helper.getEntityName(entity)!;
    return `Unknown ${entityId}`;
  }

  updateGridItem(gridItem: ActivityGridItemComponent) {
    if (!gridItem?.item) return;
    this.getGridPageItems(this.currentPage, true);
    this.cdr.detectChanges();
  }

  deleteGridItem($event: ActivityGridItemComponent) {
    if (!$event.item) return;
    const index = this.currentPage?.items.indexOf($event.item as ActivityPageCommand);
    if (index) this.currentPage?.items.splice(index, 1);
    this.getGridPageItems(this.currentPage, true);
    this.cdr.detectChanges();
  }

  gridSourceSelected($event: ActivityGridItemComponent) {
    this.gridItemSource = $event;
    this.cdr.detectChanges();
  }

  gridDestinationSelected($event: ActivityGridItemComponent) {
    this.getGridPageItems(this.currentPage, true);
    this.cdr.detectChanges();
  }

  gridItemClicked($event: ActivityGridItemComponent) {
    this.gridItem = $event;
    if (this.selectionMode)
    {
      if (this.selection.includes($event))
      {
        this.selection.splice(this.selection.indexOf($event), 1);
      }
      else {
        this.selection.push($event);
      }
      this.cdr.detectChanges();
      return;
    }
    if (!this.editMode)
    {
      if ($event.item.command && typeof $event.item.command != "string")
        this.executeCommand($event.item.command);
      return;
    }
    this.cdr.detectChanges();
    this.commandeditor?.show();
    this.cdr.detectChanges();
  }

  executeCommand(command: Command) {
    if (!this.remote) return;
    this.server.executeRemotetCommand(this.remote, command).subscribe({next: results => {
      this.onSelectButton.emit({command, mode: ButtonMode.ShortPress, severity: "success"});
      }, error: (err: HttpErrorResponse) => {
        console.error("Error command", err);
        this.onSelectButton.emit({command, mode: ButtonMode.ShortPress, severity: "error",
          error: `${err.error.name} (${err.status} ${err.statusText})`});
      }});
    this.cdr.detectChanges();
  }

  addGridItem($event: ActivityGridItemComponent) {
    const position = {x: $event.item.location.x, y: $event.item.location.y,
      width: $event.item.size.width, height: $event.item.size.height};
    this.currentPage?.items.push({location: {x: position.x, y: position.y},
      size: {width: 1, height: 1}, type: "text", text:"New command", command: {cmd_id: "", entity_id: ""}});
    this.getGridPageItems(this.currentPage, true);
    this.cdr.detectChanges();
    const targetGridItem = this.gridButtons?.find(gridButton =>
      gridButton.item?.location.x == position.x && gridButton.item?.location.y == position.y)
    this.gridItem = targetGridItem;
    console.log("New command", targetGridItem, this.gridButtons, position);
    this.commandeditor?.show();
    this.cdr.detectChanges();
  }

  getGridItemStyleSize(page: UIPage, item: ActivityPageCommand | null): any {
    const width = page?.grid.width;
    const height = page?.grid.height;
    const itemWidth = item?.size?.width ? item!.size.width : 1;
    const itemHeight = item?.size?.height ? item!.size.height : 1;
    if (!width || !height) return {};
    const style: any = {width: (itemWidth*this.width/width)+'px', height: (itemHeight!*this.height/height)+'px'};
    if (item?.size?.width! > 1)
    {
      style['grid-column-end'] = `span ${item!.size.width}`;
    }
    if (item?.size?.height! > 1)
    {
      style['grid-row-end'] = `span ${item!.size.height}`;
    }
    return style;
  }

  getGridItemSize(page: UIPage, item: ActivityPageCommand | null): {width: number; height: number} {
    const width = page?.grid.width;
    const height = page?.grid.height;
    const itemWidth = item?.size?.width ? item!.size.width : 1;
    const itemHeight = item?.size?.height ? item!.size.height : 1;
    if (!width || !height) return {width: 0, height: 0};
    return  {width: (itemWidth*this.width/width), height: (itemHeight!*this.height/height)};
  }

  mouseDownUIPages($event: MouseEvent | TouchEvent) {
    if (!this.currentPage || !this.runMode)
    {
      return;
    }
    let x = 0;
    if ($event instanceof MouseEvent) x = $event.clientX;
    else if ($event instanceof TouchEvent) x =$event.touches[0].clientX;

    const index = this.activity?.options?.user_interface?.pages?.indexOf(this.currentPage);
    if (index == undefined || index == -1) return;
    this.swipeInfo = {
      initialUiContainerPosition: this.width*index,
      uiClientX: x,
      mousePressed: true,
      uiContainerPosition: -this.width*index
    }
    $event.preventDefault();
  }

  mouseUpUIPages($event: MouseEvent | TouchEvent) {
    console.log("WIDTH2", this.width);
  }

  mouseMoveUIPages($event: MouseEvent | TouchEvent) {
    if (!this.swipeInfo.mousePressed || !this.uiCollection || !this.runMode) return;
    $event.preventDefault();
    let x = 0;
    if ($event instanceof MouseEvent) x = $event.clientX;
    else if ($event instanceof TouchEvent) x =$event.touches[0].clientX;
    this.swipeInfo.uiContainerPosition = this.swipeInfo.initialUiContainerPosition+(this.swipeInfo.uiClientX - x)*this.swipeAcceleration;
    this.uiCollection.nativeElement.setAttribute("style", `transform: translate3d(-${this.swipeInfo.uiContainerPosition}px, 0px, 0px`);
    this.cdr.detectChanges();
  }

  switchCurrentPage()
  {
    let index = Math.round(Math.abs(this.swipeInfo.uiContainerPosition/this.width));
    if (this.activity?.options?.user_interface?.pages && index >= this.activity.options.user_interface.pages.length)
      index = this.activity.options?.user_interface?.pages.length - 1;
    if (index < 0) index = 0;
    if (!this.activity?.options?.user_interface?.pages?.[index]) return;
    this.currentPage = this.activity.options.user_interface.pages[index];
    if (this.uiCollection)
      this.uiCollection.nativeElement.setAttribute("style", `transform: translate3d(-${index*100}%, 0px, 0px`);
    this.onPageChange.emit(index);
    this.cdr.detectChanges();
  }

  @HostListener('window:mouseup', ['$event'])
  onMouseUp($event: MouseEvent) {
    if (!this.currentPage || !this.runMode || !this.swipeInfo.mousePressed)
      return;
    this.swipeInfo.mousePressed = false;
    this.switchCurrentPage();
    this.cdr.detectChanges();
  }

  @HostListener('touchend', ['$event'])
  onTouchUp($event: TouchEvent) {
    this.swipeInfo.mousePressed= false;
    this.switchCurrentPage();
    this.cdr.detectChanges();
  }
}
