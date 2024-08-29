import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef, EventEmitter, HostListener, Input, Output,
  Pipe,
  PipeTransform, QueryList,
  ViewChild, ViewChildren, ViewEncapsulation
} from '@angular/core';
import {ConfirmationService, MessageService} from "primeng/api";
import {ServerService} from "../server.service";
import {
  Activity,
  ButtonMapping,
  UIPage,
  ActivityPageCommand,
  Command,
  Remote,
  Entity,
  EntityCommand
} from "../interfaces";
import {DialogModule} from "primeng/dialog";
import {ToastModule} from "primeng/toast";
import {NgForOf, NgIf} from "@angular/common";
import {PaginatorModule, PaginatorState} from "primeng/paginator";
import {ChipModule} from "primeng/chip";
// @ts-ignore
import SVGInject from "@iconfu/svg-inject";
import {OverlayPanel, OverlayPanelModule} from "primeng/overlaypanel";
import {RouterLink} from "@angular/router";
import {ActivityGridComponent, GridItem} from "./activity-grid/activity-grid.component";
import {ButtonModule} from "primeng/button";
import {NgxJsonViewerModule} from "ngx-json-viewer";
import {Helper} from "../helper";
import {UiCommandEditorComponent} from "../activity-editor/ui-command-editor/ui-command-editor.component";
import { saveAs } from 'file-saver-es';
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {ButtonEditorComponent} from "../activity-editor/button-editor/button-editor.component";

@Pipe({name: 'as', standalone: true, pure: true})
export class AsPipe implements PipeTransform {
  transform<T>(input: unknown, baseItem: T | undefined): T {
    return (input as unknown) as T;
  }
}
@Component({
  selector: 'app-activity-viewer',
  standalone: true,
  imports: [
    DialogModule,
    ToastModule,
    NgIf,
    PaginatorModule,
    NgForOf,
    AsPipe,
    ChipModule,
    OverlayPanelModule,
    RouterLink,
    ActivityGridComponent,
    ButtonModule,
    NgxJsonViewerModule,
    UiCommandEditorComponent,
    ConfirmDialogModule,
    ButtonEditorComponent
  ],
  templateUrl: './activity-viewer.component.html',
  styleUrl: './activity-viewer.component.css',
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ActivityViewerComponent implements AfterViewInit {
  currentPage: UIPage | undefined;
  configEntityCommands: EntityCommand[] | undefined;
  @Input('activity') set _activity(value: Activity | undefined) {
    this.activity = value;
    if (value) {
      this.initView();
      this.updateButtonsGrid();
    }
  }
  activity: Activity | undefined;
  currentEntity: Entity | undefined;
  @Input() remote: Remote | undefined;
  @Input() editMode = true;
  @Output() onChange: EventEmitter<void> = new EventEmitter();
  @Output() reload = new EventEmitter<void>();
  buttonsMap:{ [id: string]: string } = {};
  reversedButtonMap:{ [id: string]: string } = {};
  public Command!: Command;
  @ViewChild("buttonpanel", {static: false}) buttonpanel: OverlayPanel | undefined;
  @ViewChild("commandeditor", {static: false}) commandeditor: UiCommandEditorComponent | undefined;
  @ViewChild("input_file_page", {static: false}) input_file_page: ElementRef | undefined;
  @ViewChildren(ActivityGridComponent) gridButtons:QueryList<ActivityGridComponent> | undefined;
  @ViewChild(ButtonEditorComponent) buttonEditor:ButtonEditorComponent | undefined;


  mouseOverButtonName: string = "";
  mouseoverButton: ButtonMapping | undefined;
  selectedButton: ButtonMapping | undefined;
  buttonPanelStyle: any = { width: '450px' };
  svg: SVGElement | undefined;
  protected readonly JSON = JSON;
  gridItemSource: ActivityGridComponent | undefined;
  gridCommands: ActivityPageCommand[] = [];
  showDump: boolean = false;
  firstPage = 0;
  gridPixelWidth = 4*185;
  gridPixelHeight = 6*185;
  protected readonly Helper = Helper;
  toggleGrid = true;
  gridItem: ActivityGridComponent | undefined;


  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService,
              private confirmationService: ConfirmationService) {
    this.server.getPictureRemoteMap().subscribe(buttonsMap => {
      this.buttonsMap = buttonsMap;
      this.reversedButtonMap = Object.fromEntries(Object.entries(buttonsMap).map(([key, value]) => [value, key]));
    })
    const configCommands = localStorage.getItem("configCommands");
    if (configCommands)
      this.configEntityCommands = JSON.parse(configCommands);

    this.server.configCommands$.subscribe(entityCommands => {
      this.configEntityCommands = entityCommands;
    })
    if (!this.configEntityCommands || this.configEntityCommands.length == 0)
    {
      this.server.getConfigEntityCommands(this.remote!).subscribe(entityCommands => {
        this.configEntityCommands = entityCommands;
        this.cdr.detectChanges();
      })
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize($event: any) {
    this.gridPixelWidth = Math.min(window.innerWidth*0.8, 4*185);
    this.gridPixelHeight = Math.min(window.innerHeight*1.2, 6*185);
    this.updateButtonsGrid();
  }

  ngAfterViewInit(): void {
    // this.remotePicture?.nativeElement.addListener()
    this.gridPixelWidth = Math.min(window.innerWidth*0.8, 4*185);
    this.gridPixelHeight = Math.min(window.innerHeight*1.2, 6*185);
    SVGInject.setOptions({
      makeIdsUnique: false, // do not make ids used within the SVG unique
      afterInject: (img: any, svg: any) => {
        this.remoteLoaded(img, svg);
        this.updateButtonsGrid();
      }
    });
  }

  view(activity: Activity, editable: boolean): void {
    if (activity)
      this.activity = activity;
    this.editMode = editable;
    this.initView();
  }

  initView()
  {
    this.showDump = false;
    this.currentPage = this.activity?.options?.user_interface?.pages?.[0];
    this.firstPage = 0;
    console.log("View activity", this.activity);
    this.updateButtonsGrid();
  }

  updateButtons()
  {
    const buttons = this.svg?.getElementsByClassName("button");
    if (buttons) {
      for (let i = 0; i < buttons.length; i++) {
        const svgButton = buttons.item(i);
        svgButton?.classList.remove('button-assigned');
      }
      if (this.activity?.options?.button_mapping)
        for (let button of this.activity?.options?.button_mapping) {
          const buttonId = this.reversedButtonMap[button.button];
          if (!buttonId) continue;
          for (let i = 0; i < buttons.length; i++) {
            const svgButton = buttons.item(i);
            if (svgButton?.id == buttonId) {
              if (button.long_press || button.short_press)
                svgButton.classList.add('button-assigned');
              break;
            }
          }
        }
    }
  }

  updateButtonsGrid()
  {
    // let item: ActivityPageCommand | undefined;
    // if (this.commandeditor?.visible)
    //   item = this.gridItem?.item;
    this.gridCommands = this.getGridItems();
    this.updateButtons();
    // if (item) this.gridItem = this.gridButtons?.find(gridItem => gridItem.item == item);
    this.cdr.detectChanges();
  }

  updateGridItem(gridItem: ActivityGridComponent) {
    if (!gridItem?.item) return;
    this.updateButtonsGrid();
  }

  remoteLoaded(image: any, svg: SVGElement){
    console.log("Loaded", svg);
    this.svg = svg;
    svg.addEventListener("mouseover", (e) => {
      if ((e.target as SVGImageElement).classList.contains('button'))
      {
        const target = e.target as SVGImageElement;
        const buttonId = target.id;
        this.mouseOverButtonName = this.buttonsMap[buttonId];
        this.mouseoverButton = this.activity?.options?.button_mapping?.find(button => button.button === this.mouseOverButtonName);
        this.buttonpanel?.show(e, svg);
        // @ts-ignore
        this.buttonPanelStyle = { width: '450px',
          'left': e.pageX+'px',
          'top': e.pageY+'px',
          'margin-left': '5px',
          'margin-top': '5px',
        };
        e.stopPropagation();
        this.cdr.detectChanges();
      }
    })

    svg.addEventListener("click", (e) => {
      if (this.editMode && (e.target as SVGImageElement).classList.contains('button'))
      {
        const target = e.target as SVGImageElement;
        const buttonId = target.id;
        this.selectedButton = undefined;
        this.selectedButton = this.activity?.options?.button_mapping?.find(button => button.button === this.buttonsMap[buttonId]);
        this.cdr.detectChanges();
        this.buttonEditor?.show();
        this.cdr.detectChanges();
      }
    })
  }

  getParams(command: Command | undefined | string): string
  {
    if (!command) return "";
    if ((command as any)?.params)
      return JSON.stringify((command as any)?.params);
    return "";
  }

  getGridItems(): ActivityPageCommand[]
  {

    if (this.currentPage && this.activity?.options?.user_interface?.pages?.indexOf(this.currentPage) == -1)
    {
      if (this.firstPage >= this.activity.options.user_interface.pages.length)
        this.firstPage = this.activity.options.user_interface.pages.length -1;
      if (this.activity.options.user_interface.pages.length > 0)
      {
        this.currentPage = this.activity.options.user_interface.pages[this.firstPage];
      }
      this.toggleGrid = false;
      this.cdr.detectChanges();
      this.toggleGrid = true;
    }
    const width = this.currentPage?.grid?.width ? this.currentPage.grid.width : 4;
    const height = this.currentPage?.grid?.height ? this.currentPage.grid.height : 6;
    const matrix: boolean[][] = new Array(height)
      .fill(false)
      .map(() =>
        new Array(width).fill(false)
      );
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

  onPageChange($event: PaginatorState) {
    this.toggleGrid = false;
    this.cdr.detectChanges();
    this.toggleGrid = true;
    this.firstPage = $event.page as number;
    this.currentPage = this.activity?.options?.user_interface?.pages?.[$event.page!];
    this.updateButtonsGrid();
    console.log("Page changed", this.gridCommands);
    this.cdr.detectChanges();
  }

  getEntityName(entityId: string): string
  {
    const entity = this.server.getCachedEntities().find(entity => entity.entity_id === entityId);
    if (entity?.name)
      return Helper.getEntityName(entity)!;
    return `Unknown ${entityId}`;
  }

  getStyle(value: string): any
  {
    try {
      const color = this.getBackgroundColor(value);
      return {"background-color" : color};
    } catch (exception)
    {
      return ""
    }
  }

  getBackgroundColor(stringInput: string) {
    if (stringInput.toLowerCase().startsWith('unknown')) return 'red';
    let stringUniqueHash = [...stringInput].reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return `hsl(${stringUniqueHash % 360}, 95%, 40%)`;
  }

  gridSourceSelected($event: ActivityGridComponent) {
    this.gridItemSource = $event;
    this.cdr.detectChanges();
  }

  gridDestinationSelected($event: ActivityGridComponent) {
     this.updateButtonsGrid();
    this.cdr.detectChanges();
  }

  gridItemClicked($event: ActivityGridComponent) {
    this.gridItem = $event;
    this.cdr.detectChanges();
    this.commandeditor?.show();
    this.cdr.detectChanges();
  }

  copyToClipboard(data: any, title: string | undefined = undefined) {
    navigator.clipboard.writeText(JSON.stringify(data)).then(r => {
      if (title)
        this.messageService.add({severity:'success', summary: title, key: 'activity'});
      else
        this.messageService.add({severity:'success', summary: "Activity data copied to clipboard", key: 'activity'});
      this.cdr.detectChanges();
    });
  }

  deletePage($event: any)
  {
    if (!this.currentPage || !this.activity?.entity_id) return;
    this.confirmationService.confirm({
      target: $event.target as EventTarget,
      key: "activityViewerDialog",
      message: `Are you sure that you want to delete this page "${this.currentPage.name}" ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptIcon:"none",
      rejectIcon:"none",
      rejectButtonStyleClass:"p-button-text",
      accept: () => {
        if (!this.activity?.entity_id || !this.remote) return;
        this.server.deleteRemoteActivityPage(this.remote, this.activity.entity_id, this.currentPage!.page_id!)
          .subscribe({next: results =>
          {
            this.messageService.add({
              severity: 'success',
              summary: `Page "${this.currentPage?.name}" successfully deleted`
            });
            this.reload.emit();
            this.cdr.detectChanges();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: `Error while deleting page "${this.currentPage?.name}"`
            });
            this.cdr.detectChanges();
          }
        });

      },
      reject: () => {
      }
    });
  }

  pastePage() {
    navigator.clipboard.readText().then(data => {
      const page:UIPage = JSON.parse(data);
      if (!this.activity) return;
      if (!page || !page.grid || !page.items || !page.name)
      {
        this.messageService.add({severity:'error', summary: "Invalid data from clipboard, not an UI page", key: 'activity'});
        this.cdr.detectChanges();
        return;
      }
      if (!this.activity.options) this.activity.options = { user_interface: {} };
      if (!this.activity.options.user_interface!.pages) this.activity.options.user_interface!.pages = [];
      delete page.page_id;
      this.activity.options.user_interface!.pages.push(page);
      this.messageService.add({severity:'success', summary: `Page ${page.name} with ${page.items.length} items added successfully`, key: 'activity'});
      this.updateButtonsGrid();
      this.onChange.emit();
      this.cdr.detectChanges();
    })
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

  saveActivity()
  {
    if (!this.activity) return;
    saveAs(new Blob([JSON.stringify(this.activity)], {type: "text/plain;charset=utf-8"}),
      `${this.activity.name}.json`);
  }

  savePage()
  {
    if (!this.currentPage ||!this.activity) return;
    const fileName = this.currentPage?.name ? this.currentPage.name : "Page";
    saveAs(new Blob([JSON.stringify(this.currentPage)], {type: "text/plain;charset=utf-8"}),
      `${this.activity.name}_${fileName}.json`);
  }

  importPage() {
    this.input_file_page?.nativeElement.click();
  }

  loadInputFilePage($event: Event) {
    const file = ($event.target as any)?.files?.[0];
    let fileReader = new FileReader();
    fileReader.onload = (e) => {
      if (fileReader.result){
        const page:UIPage = JSON.parse(fileReader.result.toString());
        if (!this.activity) return;
        if (!page || !page.grid || !page.items || !page.name)
        {
          this.messageService.add({severity:'error', summary: "Invalid data from file, not an UI page", key: 'activity'});
          this.cdr.detectChanges();
          return;
        }
        if (!this.activity.options) this.activity.options = { user_interface: {} };
        if (!this.activity.options.user_interface!.pages) this.activity.options.user_interface!.pages = [];
        delete page.page_id;
        this.activity.options.user_interface!.pages.push(page);
        this.messageService.add({severity:'success', summary: `Page ${page.name} with ${page.items.length} items added successfully`, key: 'activity'});
        this.updateButtonsGrid();
        this.onChange.emit();
        this.cdr.detectChanges();
      }
    }
    fileReader.readAsText(file);
  }

  deleteActivity($event: any) {
    this.confirmationService.confirm({
      target: $event.target as EventTarget,
      key: "activityViewerDialog",
      message: `Are you sure that you want to delete the activity "${this.activity?.name}" ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptIcon:"none",
      rejectIcon:"none",
      rejectButtonStyleClass:"p-button-text",
      accept: () => {
        if (!this.activity?.entity_id || !this.remote) return;
        this.server.deleteRemoteActivity(this.remote, this.activity.entity_id).subscribe({next: results =>
          {
            this.messageService.add({
              severity: 'success',
              summary: `Activity "${this.activity?.name}" successfully deleted`
            });
            this.onChange.emit();
            this.cdr.detectChanges();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: `Error while deleting activity "${this.activity?.name}"`
            });
            this.cdr.detectChanges();
          }
      });

      },
      reject: () => {
      }
    });
  }

  addGridItem($event: ActivityGridComponent) {
    const position = Helper.getItemPosition(this.gridCommands, $event.getIndex(), this.currentPage!.grid.width,
      this.currentPage!.grid.height);
    if (!position || !this.activity?.options?.included_entities || this.activity.options.included_entities.length == 0 ||
      !this.configEntityCommands) return;
    if (!this.currentEntity)
      this.currentEntity = this.activity.options.included_entities[0];

    const commands = this.configEntityCommands.filter(command =>
      command.id.startsWith(this.currentEntity!.entity_type!));
    let cmd_id = "";
    if (commands.length == 0)
    {
      console.error("No commands available to add a new grid item", this.configEntityCommands, this.currentEntity);
    }
    else
      cmd_id = commands[0].cmd_id;
    this.currentPage?.items.push({location: {x: position.x, y: position.y},
      size: {width: 1, height: 1}, type: "text", text:"New command", command: {entity_id: this.currentEntity.entity_id!,
      cmd_id}});
    this.updateButtonsGrid();
    this.cdr.detectChanges();
    const targetGridItem = this.gridButtons?.find(gridButton =>
      gridButton.item?.location.x == position.x && gridButton.item?.location.y == position.y)
    this.gridItem = targetGridItem;
    console.log("New command", targetGridItem, this.gridButtons, position);
    this.commandeditor?.show();
    this.cdr.detectChanges();
  }

  deleteGridItem($event: ActivityGridComponent) {
    if (!$event.item) return;
    const index = this.currentPage?.items.indexOf($event.item as ActivityPageCommand);
    if (index) this.currentPage?.items.splice(index, 1);
    this.updateButtonsGrid();
  }

  buttonChanged($event: ButtonMapping) {
    this.updateButtons();
    this.cdr.detectChanges();
  }

  addPage($event: MouseEvent) {
    if (!this.activity) return;
    if (!this.activity.options) this.activity.options = {};
    if (!this.activity.options.user_interface) this.activity.options.user_interface = { pages: []};
    this.activity.options.user_interface.pages?.push({name: "New page", items: [], grid: {width: 4, height: 6}});
    this.updateButtonsGrid();
  }
}
