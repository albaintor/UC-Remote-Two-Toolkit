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
import {Activity, ActivityButtonMapping, ActivityPage, ActivityPageCommand, Command, Remote} from "../interfaces";
import {DialogModule} from "primeng/dialog";
import {ToastModule} from "primeng/toast";
import {NgForOf, NgIf} from "@angular/common";
import {PaginatorModule, PaginatorState} from "primeng/paginator";
import {ChipModule} from "primeng/chip";
// @ts-ignore
import SVGInject from "@iconfu/svg-inject";
import {OverlayPanel, OverlayPanelModule} from "primeng/overlaypanel";
import {RouterLink} from "@angular/router";

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
    RouterLink
  ],
  templateUrl: './activity-viewer.component.html',
  styleUrl: './activity-viewer.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ActivityViewerComponent implements AfterViewInit {
  visible = false;
  currentPage: ActivityPage | undefined;
  @Input() activity: Activity | undefined;
  @Input() remote: Remote | undefined;
  buttonsMap:{ [id: string]: string } = {};
  reversedButtonMap:{ [id: string]: string } = {};
  public Command!: Command;
  @ViewChild("buttonpanel", {static: false}) buttonpanel: OverlayPanel | undefined;
  selectedButton: string = "";
  selectedButtonMapping: ActivityButtonMapping | undefined;

  buttonPanelStyle: any = { width: '450px' };
  svg: SVGElement | undefined;

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

  isStandardIcon(icon: string | undefined): boolean {
    if (!icon) return false;
    return icon?.startsWith("uc:");
  }

  isCustomIcon(icon: string | undefined): boolean {
    if (!icon) return false;
    return !icon?.startsWith("uc:");
  }

  getIconClass(icon?: string): string
  {
    if (icon?.startsWith("uc:"))
      return "icon icon-" + icon.replace("uc:", "")
    return ""
  }

  view(activity: Activity): void {
    if (activity)
      this.activity = activity;
    this.visible = true;
    this.currentPage = this.activity?.options?.user_interface?.pages?.[0];
    console.log("View activity", this.activity);
    const buttons = this.svg?.getElementsByClassName("button");
    if (buttons) {
      for (let i = 0; i < buttons.length; i++) {
        const svgButton = buttons.item(i);
        svgButton?.classList.remove('button-assigned');
      }
      if (this.activity?.options?.button_mapping)
      for (let button of this.activity?.options?.button_mapping)
      {
        const buttonId = this.reversedButtonMap[button.button];
        if (!buttonId) continue;
        for (let i = 0; i < buttons.length; i++) {
          const svgButton = buttons.item(i);
          if (svgButton?.id == buttonId)
          {
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

  loadActivity(activity: Activity)
  {
    this.activity = activity;
    this.currentPage = activity.options?.user_interface?.pages?.[0];
    this.visible = true;
    this.cdr.detectChanges();
  }

  onPageChange($event: PaginatorState) {
    this.currentPage = this.activity?.options?.user_interface?.pages?.[$event.page!];
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

    protected readonly JSON = JSON;

  getIconURL(icon: string | undefined) {
    if (!icon) return "";
    const filename = icon.replace("custom:", "");
    return `/api/remote/${this.remote?.address}/resources/Icon/${filename}`;
  }
}
