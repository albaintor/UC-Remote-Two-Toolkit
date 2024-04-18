import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Pipe,
  PipeTransform,
  ViewChild
} from '@angular/core';
import {MessageService} from "primeng/api";
import {ServerService} from "../server.service";
import {Activity, ActivityButtonMapping, ActivityPage, ActivityPageCommand, Command} from "../interfaces";
import {DialogModule} from "primeng/dialog";
import {ToastModule} from "primeng/toast";
import {NgForOf, NgIf} from "@angular/common";
import {PaginatorModule, PaginatorState} from "primeng/paginator";
import {ChipModule} from "primeng/chip";
// @ts-ignore
import SVGInject from "@iconfu/svg-inject";
import {OverlayPanel, OverlayPanelModule} from "primeng/overlaypanel";

@Pipe({name: 'as', standalone: true, pure: true})
export class AsPipe implements PipeTransform {
  transform<T>(input: unknown, baseItem: T | undefined): T {
    return (input as unknown) as T;
  }
}
@Component({
  selector: 'app-activity-editor',
  standalone: true,
  imports: [
    DialogModule,
    ToastModule,
    NgIf,
    PaginatorModule,
    NgForOf,
    AsPipe,
    ChipModule,
    OverlayPanelModule
  ],
  templateUrl: './activity-editor.component.html',
  styleUrl: './activity-editor.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityEditorComponent implements AfterViewInit {
  visible = false;
  currentPage: ActivityPage | undefined;
  activity: Activity | undefined;
  buttonsMap:{ [id: string]: string } = {};
  public Command!: Command;
  @ViewChild("buttonpanel", {static: false}) buttonpanel: OverlayPanel | undefined;
  selectedButton: string = "";
  selectedButtonMapping: ActivityButtonMapping | undefined;
  buttonPanelStyle: any = { width: '450px' };

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
    this.server.getRemoteMap().subscribe(butonsMap => {
      this.buttonsMap = butonsMap;
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

  remoteLoaded(image: any, svg: SVGElement){
    console.log("Loaded", svg);
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
    console.log("Grid for activity", list);
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
    const entity = this.server.entities.find(entity => entity.entity_id === entityId);
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
}
