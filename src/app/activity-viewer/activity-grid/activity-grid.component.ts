import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, HostListener,
  Input, Pipe, PipeTransform, QueryList,
  ViewChild, ViewChildren,
  ViewEncapsulation
} from '@angular/core';
import {Helper} from "../../helper";
import {ActivityGridItemComponent} from "../activity-grid-item/activity-grid-item.component";
import {ChipModule} from "primeng/chip";
import {NgForOf, NgIf} from "@angular/common";
import {TagModule} from "primeng/tag";
import {
  Activity,
  ActivityPageCommand,
  Command,
  EntityCommand,
  Remote,
  ScreenLayout,
  UIPage
} from "../../interfaces";
import {UiCommandEditorComponent} from "../../activity-editor/ui-command-editor/ui-command-editor.component";
import {HttpErrorResponse} from "@angular/common/http";
import {ServerService} from "../../server.service";
import {MessageService} from "primeng/api";
import {ToastModule} from "primeng/toast";
import {ActivityMediaEntityComponent} from "../actiivty-media-entity/activity-media-entity.component";

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
    ActivityMediaEntityComponent
  ],
  templateUrl: './activity-grid.component.html',
  styleUrl: './activity-grid.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService]
})
export class ActivityGridComponent implements AfterViewInit {
  currentPage: UIPage | undefined;
  @Input() activity: Activity | undefined;
  @Input("currentPage") set _currentPage( currentPage: UIPage | undefined)
  {
    this.currentPage = currentPage;
    this.gridCommands = this.getGridItems();
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
  @Input() runMode = false;
  gridCommands: ActivityPageCommand[] = [];
  gridItemSource: ActivityGridItemComponent | undefined;
  gridItem: ActivityGridItemComponent | undefined;
  selection: ActivityGridItemComponent[] = [];
  @ViewChild("commandeditor", {static: false}) commandeditor: UiCommandEditorComponent | undefined;
  @ViewChildren(ActivityGridItemComponent) gridButtons:QueryList<ActivityGridItemComponent> | undefined;

  configEntityCommands: EntityCommand[] | undefined;
  public Command!: Command;
  protected readonly Helper = Helper;
  screenLayout: ScreenLayout | undefined;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
  }

  ngAfterViewInit(): void {
    this.width = Math.min(window.innerWidth*0.8, this.widthInit);
    this.height = Math.min(window.innerHeight*1.2, this.heightInit);
    // const data = localStorage.getItem("remoteData");
    // if (data) {
    //   const remoteData: RemoteData = JSON.parse(data);
    //   if (remoteData.configCommands) {
    //     this.configEntityCommands = remoteData.configCommands;
    //   }
    // }
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
  }

  @HostListener('window:resize', ['$event'])
  onResize($event: any) {
    this.width = Math.min(window.innerWidth*0.8, this.widthInit);
    this.height = Math.min(window.innerHeight*1.2, this.heightInit);
    this.updateButtonsGrid();
  }

  getGridItems(): ActivityPageCommand[]
  {
    // if (this.currentPage && this.activity?.options?.user_interface?.pages?.indexOf(this.currentPage) == -1)
    // {
    //   if (this.firstPage >= this.activity.options.user_interface.pages.length)
    //     this.firstPage = this.activity.options.user_interface.pages.length -1;
    //   if (this.activity.options.user_interface.pages.length > 0)
    //   {
    //     this.currentPage = this.activity.options.user_interface.pages[this.firstPage];
    //   }
    //   this.toggleGrid = false;
    //   this.cdr.detectChanges();
    //   this.toggleGrid = true;
    // }
    // const width = this.currentPage?.grid?.width ? this.currentPage.grid.width : 4;
    // const height = this.currentPage?.grid?.height ? this.currentPage.grid.height : 6;

    const list: ActivityPageCommand[] = [];
    for (let y=0; y<this.currentPage?.grid.height!;y++)
    {
      for (let x=0; x<this.currentPage?.grid.width!;x++)
      {
        const item = this.currentPage?.items.find(item => item.location.x == x && item.location.y == y);
        if (item == null)
        {
          if (!Helper.findItem(list, x, y)) list.push({type: "text", location:{x, y}, size: {width: 1, height: 1}});
        }
        else {
          list.push(item);
        }
      }
    }
    // console.log("Grid for activity", list);
    return list;
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
    this.updateButtonsGrid();
  }

  deleteGridItem($event: ActivityGridItemComponent) {
    if (!$event.item) return;
    const index = this.currentPage?.items.indexOf($event.item as ActivityPageCommand);
    if (index) this.currentPage?.items.splice(index, 1);
    this.updateButtonsGrid();
  }

  gridSourceSelected($event: ActivityGridItemComponent) {
    this.gridItemSource = $event;
    this.cdr.detectChanges();
  }

  gridDestinationSelected($event: ActivityGridItemComponent) {
    this.updateButtonsGrid();
    this.cdr.detectChanges();
  }

  updateButtonsGrid()
  {
    this.gridCommands = this.getGridItems();
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
        this.messageService.add({key: "activityGrid", summary: "Command executed",
          severity: "success", detail: `Results : ${results.code} : ${results.message}`});
      }, error: (err: HttpErrorResponse) => {
        console.error("Error command", err);
        this.messageService.add({key: "activityGrid", summary: "Error executing command",
          severity: "error", detail: `Results : ${err.error.name} (${err.status} ${err.statusText})`});
      }});
    this.cdr.detectChanges();
  }


  addGridItem($event: ActivityGridItemComponent) {
    const position = {x: $event.item.location.x, y: $event.item.location.y,
      width: $event.item.size.width, height: $event.item.size.height};
    this.currentPage?.items.push({location: {x: position.x, y: position.y},
      size: {width: 1, height: 1}, type: "text", text:"New command", command: {cmd_id: "", entity_id: ""}});
    this.updateButtonsGrid();
    this.cdr.detectChanges();
    const targetGridItem = this.gridButtons?.find(gridButton =>
      gridButton.item?.location.x == position.x && gridButton.item?.location.y == position.y)
    this.gridItem = targetGridItem;
    console.log("New command", targetGridItem, this.gridButtons, position);
    this.commandeditor?.show();
    this.cdr.detectChanges();
  }

  getGridItemStyleSize(item: ActivityPageCommand | null): any {
    const width = this.currentPage?.grid.width;
    const height = this.currentPage?.grid.height;
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

  getGridItemSize(item: ActivityPageCommand | null): {width: number; height: number} {
    const width = this.currentPage?.grid.width;
    const height = this.currentPage?.grid.height;
    const itemWidth = item?.size?.width ? item!.size.width : 1;
    const itemHeight = item?.size?.height ? item!.size.height : 1;
    if (!width || !height) return {width: 0, height: 0};
    return  {width: (itemWidth*this.width/width), height: (itemHeight!*this.height/height)};
  }

}
