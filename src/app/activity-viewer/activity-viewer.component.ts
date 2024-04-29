import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef, Input,
  Pipe,
  PipeTransform,
  ViewChild, ViewEncapsulation
} from '@angular/core';
import {MessageService} from "primeng/api";
import {ServerService} from "../server.service";
import {Activity, ButtonMapping, UIPage, ActivityPageCommand, Command, Remote} from "../interfaces";
import {DialogModule} from "primeng/dialog";
import {ToastModule} from "primeng/toast";
import {NgForOf, NgIf} from "@angular/common";
import {PaginatorModule, PaginatorState} from "primeng/paginator";
import {ChipModule} from "primeng/chip";
// @ts-ignore
import SVGInject from "@iconfu/svg-inject";
import {OverlayPanel, OverlayPanelModule} from "primeng/overlaypanel";
import {RouterLink, withComponentInputBinding} from "@angular/router";
import {ActivityGridComponent, GridItem} from "./activity-grid/activity-grid.component";
import {ButtonModule} from "primeng/button";
import {NgxJsonViewerModule} from "ngx-json-viewer";
import {Helper} from "../helper";
import {CommandEditorComponent} from "../activity-editor/command-editor/command-editor.component";

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
    CommandEditorComponent
  ],
  templateUrl: './activity-viewer.component.html',
  styleUrl: './activity-viewer.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ActivityViewerComponent implements AfterViewInit {
  visible = false;
  currentPage: UIPage | undefined;
  @Input() activity: Activity | undefined;
  @Input() remote: Remote | undefined;
  @Input() editMode = true;
  buttonsMap:{ [id: string]: string } = {};
  reversedButtonMap:{ [id: string]: string } = {};
  public Command!: Command;
  @ViewChild("buttonpanel", {static: false}) buttonpanel: OverlayPanel | undefined;
  @ViewChild("commandeditor", {static: false}) commandeditor: CommandEditorComponent | undefined;

  selectedButton: string = "";
  selectedButtonMapping: ButtonMapping | undefined;

  buttonPanelStyle: any = { width: '450px' };
  svg: SVGElement | undefined;
  protected readonly JSON = JSON;
  gridSource: GridItem | undefined;
  grid: (ActivityPageCommand | null)[] = [];
  showDump: boolean = false;
  firstRow = 0;
  gridWidth = 4*185;
  gridHeight = 6*185;


  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
    this.server.getPictureRemoteMap().subscribe(buttonsMap => {
      this.buttonsMap = buttonsMap;
      this.reversedButtonMap = Object.fromEntries(Object.entries(buttonsMap).map(([key, value]) => [value, key]));
    })
  }

  ngAfterViewInit(): void {
    // this.remotePicture?.nativeElement.addListener()
    SVGInject.setOptions({
      makeIdsUnique: false, // do not make ids used within the SVG unique
      afterInject: (img: any, svg: any) => {
        this.remoteLoaded(img, svg);
      }
    });
  }

  view(activity: Activity, editable: boolean): void {
    if (activity)
      this.activity = activity;
    this.editMode = editable;
    this.showDump = false;
    this.visible = true;
    this.currentPage = this.activity?.options?.user_interface?.pages?.[0];
    this.firstRow = 0;
    console.log("View activity", this.activity);
    this.updateButtonsGrid();
  }

  updateButtonsGrid()
  {
    this.grid = this.getGridItems();

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
    this.cdr.detectChanges();
  }

  remoteLoaded(image: any, svg: SVGElement){
    console.log("Loaded", svg);
    this.svg = svg;
    svg.addEventListener("mouseover", (e) => {
      if ((e.target as SVGImageElement).classList.contains('button'))
      {
        const target = e.target as SVGImageElement;
        const buttonId = target.id;
        this.selectedButton = this.buttonsMap[buttonId];
        this.selectedButtonMapping = this.activity?.options?.button_mapping?.find(button => button.button === this.selectedButton);
        this.buttonpanel?.show(e, svg);
        // @ts-ignore
        this.buttonPanelStyle = { width: '450px',
          'left': e.pageX+'px',
          'top': e.pageY+'px',
          'margin-left': '5px',
          'margin-top': '5px',
        };
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

  getGridItems(): (ActivityPageCommand | null)[]
  {
    const list: (ActivityPageCommand | null)[] = [];
    for (let y=0; y<this.currentPage?.grid.height!; y++)
    {
      for (let x=0; x<this.currentPage?.grid.width!; x++)
      {
        const item = this.currentPage?.items.find(item => item.location.x == x && item.location.y == y);
        if (item == null) list.push(null);
        else
          list.push(item);
      }
    }
    // console.log("Grid for activity", list);
    return list;
  }

  onPageChange($event: PaginatorState) {
    this.currentPage = this.activity?.options?.user_interface?.pages?.[$event.page!];
    this.updateButtonsGrid();
    this.cdr.detectChanges();
  }

  getEntityName(entityId: string): string
  {
    const entity = this.server.getEntities().find(entity => entity.entity_id === entityId);
    if (entity?.name)
      return entity.name;
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

  gridSourceSelected($event: GridItem) {
    this.gridSource = $event;
    this.cdr.detectChanges();
  }

  gridDestinationSelected($event: GridItem) {
    let sourceX = this.gridSource?.index! % this.currentPage?.grid.width!;
    let sourceY = Math.floor(this.gridSource?.index! / this.currentPage?.grid.width!);
    let destinationX = $event.index! % this.currentPage?.grid.width!;
    let destinationY = Math.floor($event.index! / this.currentPage?.grid.width!);
    if (this.gridSource?.item?.location)
    {
      console.log(`Source ${this.gridSource.item.location.x},${this.gridSource.item.location.y} => ${destinationX},${destinationY}`, this.currentPage?.items)
      this.gridSource.item.location = {x: destinationX, y: destinationY};
    }
    if ($event.item?.location)
    {
      console.log(`Destination ${$event.item.location.x},${$event.item.location.y} => ${sourceX},${sourceY}`, this.currentPage?.items)
      $event.item.location = {x: sourceX, y: sourceY};
    }
    // this.messageService.add({severity:'info', summary: `${this.gridSource?.index} (${sourceX},${sourceY}) moved to ${$event.index} (${destinationX},${destinationY})`, key: 'activity'});
    this.cdr.detectChanges();
  }

  gridItemClicked($event: GridItem) {
    this.messageService.add({severity:'info', summary: `${$event.index} clicked. TODO`, key: 'activity'});
    this.commandeditor?.show(this.remote!, $event.item);
    this.cdr.detectChanges();
  }

  copyToClipboard(data: any) {
    navigator.clipboard.writeText(JSON.stringify(data)).then(r => {
      this.messageService.add({severity:'info', summary: "Activity data copied to clipboard", key: 'activity'});
      this.cdr.detectChanges();
    });
  }

  getGridSize(item: ActivityPageCommand | null): any {
    const width = this.currentPage?.grid.width;
    const height = this.currentPage?.grid.height;
    if (!width || !height) return {};
    return {width: (this.gridWidth/width)+'px', height: (this.gridHeight/height)+'px'};
  }

  protected readonly Helper = Helper;
}
