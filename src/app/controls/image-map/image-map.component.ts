import {
  AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  ElementRef, EventEmitter,
  Input, OnDestroy, Output, Renderer2,
  TemplateRef, ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {NgIf, NgOptimizedImage, NgTemplateOutlet} from "@angular/common";
import {fromEvent, merge, of, Subscription, timer, timeout, from, takeUntil, Observable} from "rxjs";
import {filter, map, switchMap} from "rxjs/operators";

export interface MapElement
{
  event: MouseEvent|Event;
  tag: string | null;
}

@Component({
    selector: 'app-image-map',
    imports: [
        NgTemplateOutlet,
        NgIf
    ],
    templateUrl: './image-map.component.html',
    styleUrl: './image-map.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.ShadowDom
})
export class ImageMapComponent implements AfterViewInit, OnDestroy {
  @Input() image: string  = "";
  @Input() description: string = "";
  @Input() useCanvas = false;
  @Input() imageSize: {width: number; height: number} | undefined;
  @Input() imageTemplate : TemplateRef<HTMLAreaElement> | undefined;
  selectedTags: string[] | undefined;
  @Input('selectedTags') set _selectedTags(value: string[] | undefined) {
    this.selectedTags = value;
    this.updateSelectedItems();
  }
  @Output() overElement = new EventEmitter<MapElement>();
  @Output() leaveElement = new EventEmitter<MapElement>();
  @Output() clickElement = new EventEmitter<MapElement>();
  @ViewChild('imageElement', {static: false}) imageElement: ElementRef<HTMLImageElement> | undefined;
  @ViewChild("imageMap", {static: false}) imageMap: ElementRef<HTMLMapElement> | undefined;
  @ViewChild("canvas", {static: false}) canvas: ElementRef<HTMLCanvasElement> | undefined;
  @ViewChild("mapSelector", {static: false}) mapSelector: ElementRef<HTMLDivElement> | undefined;
  @ViewChild("mapSelected", {static: true}) mapSelected: ElementRef<HTMLDivElement> | undefined;
  @ViewChild("imageContainer", {static: false}) imageContainer: ElementRef<HTMLDivElement> | undefined;
  private hdc: CanvasRenderingContext2D | null | undefined;
  imageMapText: string | undefined;
  private selectedItems:  HTMLDivElement[] = [];
  subscriptions: Subscription[] = [];
  @Input() longPressThreshold = 500;
  @Input() longPressRepeat = 200;
  @Output() mouseLongPress = new EventEmitter<MapElement>();

  constructor(private cdr:ChangeDetectorRef, private renderer: Renderer2) {
  }

  ngAfterViewInit(): void {
    if (this.useCanvas) this.initCanvas();
    else this.initMapselector();
  }

  updateSelectedItems()
  {
    const map = this.imageMap?.nativeElement;
    const mapSelected = this.mapSelected?.nativeElement;
    const image = this.imageElement?.nativeElement;
    if (!map || !mapSelected || !image) return;
    const width = image.width;
    const height = image.height;
    if (!this.selectedTags || this.selectedTags.length == 0) return;
    this.selectedItems.forEach(div => this.renderer.removeChild(mapSelected, div));
    this.selectedItems = [];
    this.cdr.detectChanges();
    map.childNodes.forEach(node => {
      if (node instanceof HTMLAreaElement) {
        const tag = node.getAttribute("data-tag");
        if (!tag) return;
        const coordinates = ImageMapComponent.getCoordinates(node);
        if (this.selectedTags && this.selectedTags.includes(tag)) {
          let div = this.renderer.createElement('div');
          this.renderer.setStyle(div, "top", coordinates.top + 'px');
          this.renderer.setStyle(div, "left", coordinates.left + 'px');
          this.renderer.setStyle(div, "right", (width - coordinates.right) + 'px');
          this.renderer.setStyle(div, "bottom", (height - coordinates.bottom) + 'px');
          this.renderer.setStyle(div, "display", "block");
          this.renderer.addClass(div, "map-selected-item");
          this.renderer.appendChild(mapSelected, div);
          this.selectedItems.push(div);
        }
      }
    });
    this.cdr.detectChanges();
  }

  static getCoordinates(node: HTMLAreaElement): {left: number, right: number, top: number, bottom: number}
  {
    let coordinates = node.getAttribute('coords')!;
    let mCoords = coordinates.split(',').map(value => parseInt(value));
    let top = mCoords[1], left = mCoords[0], bottom = mCoords[3], right = mCoords[2];
    return {left, right, top, bottom};
  }

  clickEvents(node: HTMLElement, mouseupwindow:Observable<MouseEvent>)
  {
    const mousedown = fromEvent<MouseEvent>(node, 'mousedown').pipe(
      filter((event) => event.button == 0), // Only allow left button (Primary button)
      map((event) => event) // turn on threshold counter
    );
    const touchstart = fromEvent(node, 'touchstart').pipe(
      map((touchEvent) => touchEvent)
    );
    const touchEnd = fromEvent((node as HTMLAreaElement), 'touchend').pipe(
      map((touchEvent) => touchEvent)
    );
    const mouseup = fromEvent<MouseEvent>(node, 'mouseup').pipe(
      filter((event) => event.button == 0), // Only allow left button (Primary button)
      map((event) => event) // reset threshold counter
    );

    return merge(mousedown, touchstart).pipe(
      switchMap((startEvent: MouseEvent|Event, index) =>
        merge(mouseup, touchEnd).pipe(
          map(endEvent => {
            console.log("Click", node.getAttribute("data-tag"));
            return {type: "shortpress", event: endEvent};
          }),
          timeout({first: this.longPressThreshold, with: (info) => {
            if (this.longPressRepeat == 0) return of({type: "longpress", event: startEvent});
            return timer(0, this.longPressRepeat).pipe(map(count => {
              return {type: "longpress", event: startEvent,timing: (count*this.longPressRepeat)}
            }), takeUntil(merge(mouseup, touchEnd, mouseupwindow)))
          }}),
      )));
  }

  initMapselector()
  {
    const image = this.imageElement?.nativeElement;
    const imageMap = this.imageMap?.nativeElement;
    const mapSelector = this.mapSelector?.nativeElement;
    const imageContainer = this.imageContainer?.nativeElement;
    if (!image || !imageMap || !mapSelector || !imageContainer) return;
    const width = image.width;
    const height = image.height;
    const mouseupwindow = fromEvent<MouseEvent>(window, "mouseup");
    imageMap.childNodes.forEach(node => {
      if (node instanceof HTMLAreaElement)
      {
          (node as HTMLAreaElement).addEventListener("mouseover", (event) => {
          let coordinates = ImageMapComponent.getCoordinates(node);
          mapSelector.style.top = coordinates.top + 'px';
          mapSelector.style.left = coordinates.left + 'px';
          mapSelector.style.right = (width - coordinates.right) + 'px';
          mapSelector.style.bottom = (height - coordinates.bottom) + 'px';
          mapSelector.style.display = "block";
          this.imageMapText = node.title;
          this.overElement.emit({event, tag: node.getAttribute("data-tag")});
          this.cdr.detectChanges();
        });
        (node as HTMLAreaElement).addEventListener("mouseleave", (event) => {
          this.leaveElement.emit({event, tag: node.getAttribute("data-tag")});
        });
        (node as HTMLAreaElement).addEventListener("click", (event) => {
          // this.clickElement.emit({event, tag: node.getAttribute("data-tag")});
          // console.log("Short press", event);
          event.preventDefault();
          return false;
        });
        this.subscriptions.push(this.clickEvents(node, mouseupwindow).subscribe((event) => {
          if (event.type === "shortpress") this.clickElement.emit({event: event.event, tag: node.getAttribute("data-tag")})
          else this.mouseLongPress.emit({event: event.event, tag: node.getAttribute("data-tag")})
        }));
      }
    });
    mapSelector.addEventListener("click", (event) => {
      return false;
    })
    this.updateSelectedItems();
  }

  initCanvas()
  {
    let image = this.imageElement?.nativeElement;
    let map = this.imageMap?.nativeElement;
    if (!image || !this.canvas?.nativeElement || !map) return;
    map.childNodes.forEach(node => {
      if (node instanceof HTMLAreaElement)
      {
        (node as HTMLAreaElement).addEventListener("mouseover", (event: any) => {
          this.canvasMouseOver(node)
          this.overElement.emit({event, tag: node.getAttribute("data-tag")});
        });
        (node as HTMLAreaElement).addEventListener("mouseleave", (event: any) => {
          this.canvasMouseLeave(node);
          this.leaveElement.emit({event, tag: node.getAttribute("data-tag")});
        });
        (node as HTMLAreaElement).addEventListener("click", (event: any) => {
          this.clickElement.emit({event, tag: node.getAttribute("data-tag")});
        });
      }
    })

    // get it's position and width+height
    let x = image.offsetLeft, y = image.offsetTop, w = image.clientWidth, h = image.clientHeight;

    // position it over the image
    this.canvas.nativeElement.style.left = x+'px';
    this.canvas.nativeElement.style.top = y+'px';

    // make same size as the image
    this.canvas.nativeElement.setAttribute('width', w+'px');
    this.canvas.nativeElement.setAttribute('height', h+'px');

    // get it's context
    this.hdc = this.canvas.nativeElement.getContext('2d');
    if (!this.hdc) return;
    // set the 'default' values for the colour/width of fill/stroke operations
    this.hdc.fillStyle = 'red';
    this.hdc.strokeStyle = 'red';
    this.hdc.lineWidth = 2;
    this.hdc.font = "28px trebuchet ms";
    this.hdc.textAlign = "center";
  }

  drawPoly(coOrdStr: string)
  {
    if (!this.hdc) return;
    let mCoords = coOrdStr.split(',').map(value => parseInt(value));
    let i: number, n = mCoords.length;
    this.hdc.beginPath();
    this.hdc.moveTo(mCoords[0], mCoords[1]);
    for (i=2; i<n; i+=2)
    {
      this.hdc.lineTo(mCoords[i], mCoords[i+1]);
    }
    this.hdc.lineTo(mCoords[0], mCoords[1]);
    this.hdc.stroke();
  }

  drawRect(coOrdStr: string): {left: number, right: number, top: number, bottom: number} | undefined
  {
    // console.debug("Draw", coOrdStr, this.hdc);
    if (!this.hdc) return undefined;
    let mCoords = coOrdStr.split(',').map(value => parseInt(value));
    let top: number, left: number, bottom: number, right: number;
    left = mCoords[0];
    top = mCoords[1];
    right = mCoords[2];
    bottom = mCoords[3];

    this.hdc.strokeRect(left,top,right-left,bottom-top);
    return {left, right, top, bottom}
  }

  canvasMouseOver(element: HTMLAreaElement)
  {
    let coordinates = element.getAttribute('coords')!;
    let areaType = element.getAttribute('shape');

    switch (areaType)
    {
      case 'polygon':
      case 'poly':
        this.drawPoly(coordinates);
        break;

      case 'rect': {
        const coords = this.drawRect(coordinates);
        const label = element.title;
        if (label && coords)
        {
          let top = coords.top - 10;
          if (top - 50 < 0)
            top = coords.bottom + 30;
          let left = coords.left + (coords.right - coords.left)/2;
          this.hdc?.fillText(label, left, top);
        }
      }
    }

  }

  canvasMouseLeave(element: HTMLAreaElement)
  {
    if (!this.hdc || !this.canvas?.nativeElement) return;
    this.hdc.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.subscriptions = [];
  }

}
