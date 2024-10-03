import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, EventEmitter, HostListener,
  Input, Output, Pipe, PipeTransform, QueryList,
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
  RemoteData,
  ScreenLayout,
  UIPage
} from "../../interfaces";
import {UiCommandEditorComponent} from "../../activity-editor/ui-command-editor/ui-command-editor.component";
import {HttpErrorResponse} from "@angular/common/http";
import {ServerService} from "../../server.service";
import {MessageService} from "primeng/api";
import {ToastModule} from "primeng/toast";
import {MediaEntityState, RemoteWebsocketService} from "../../remote-widget/remote-websocket.service";
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
    this.mediaEntities = [];
    this.currentPage?.items?.forEach(item => {
      if (item.type === "media_player" && item.media_player_id)
        this.mediaEntities.push(item.media_player_id);
    })
    this.mediaStates = this.remoteWebsocketService.mediaEntities.filter(item => this.mediaEntities.includes(item.entity_id));
    this.cdr.detectChanges();
  }
  @Input() remote: Remote | undefined;
  gridPixelWidth = 4*185;
  gridPixelWidthInit = this.gridPixelWidth;
  @Input("gridPixelWidth") set _gridPixelWidth(gridPixelWidth: number) {
    this.gridPixelWidth = gridPixelWidth;
    this.gridPixelWidthInit = gridPixelWidth;
  }
  gridPixelHeight = 6*185;
  gridPixelHeightInit = this.gridPixelHeight;
  @Input("gridPixelHeight") set _gridPixelHeight(gridPixelHeight: number) {
    this.gridPixelHeight = gridPixelHeight;
    this.gridPixelHeightInit = gridPixelHeight;
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
  mediaEntities: string[] = [];
  mediaStates: MediaEntityState[] = [];

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService,
              private remoteWebsocketService: RemoteWebsocketService) {
  }

  ngAfterViewInit(): void {
    this.gridPixelWidth = Math.min(window.innerWidth*0.8, this.gridPixelWidthInit);
    this.gridPixelHeight = Math.min(window.innerHeight*1.2, this.gridPixelHeightInit);
    this.remoteWebsocketService.onMediaStateChange().subscribe(mediaStates => {
      this.init(mediaStates);
    });
    this.remoteWebsocketService.onMediaPositionChange().subscribe(mediaPositions => {
      let update = false;
      mediaPositions.forEach(mediaState => {
        if (this.mediaEntities.includes(mediaState.entity_id)) update = true;
      });
      if (update) this.cdr.detectChanges();
    })
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
    this.init(this.remoteWebsocketService.mediaEntities);
  }

  init(mediaStates: MediaEntityState[])
  {
    mediaStates.forEach(mediaState => {
      const existing = this.mediaStates.find(mediaState => mediaState.entity_id);
      if (existing)
      {
        this.mediaStates[this.mediaStates.indexOf(existing)] = mediaState;
        this.cdr.detectChanges();
        return;
      }
      if (this.mediaEntities.includes(mediaState.entity_id))
      {
        this.mediaStates.push(mediaState);
        this.cdr.detectChanges();
      }
    })
  }

  @HostListener('window:resize', ['$event'])
  onResize($event: any) {
    this.gridPixelWidth = Math.min(window.innerWidth*0.8, this.gridPixelWidthInit);
    this.gridPixelHeight = Math.min(window.innerHeight*1.2, this.gridPixelHeightInit);
    this.updateButtonsGrid();
  }

  getMediaEntity(entityId: string)
  {
    return this.mediaStates.find(item => item.entity_id === entityId)
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

  getGridItemSize(item: ActivityPageCommand | null): any {
    const width = this.currentPage?.grid.width;
    const height = this.currentPage?.grid.height;
    const itemWidth = item?.size?.width ? item!.size.width : 1;
    const itemHeight = item?.size?.height ? item!.size.height : 1;
    if (!width || !height) return {};
    const style: any = {width: (itemWidth*this.gridPixelWidth/width)+'px', height: (itemHeight!*this.gridPixelHeight/height)+'px'};
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

}
