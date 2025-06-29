import {
  AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild, ViewEncapsulation
} from '@angular/core';
import {ActivityPageCommand} from "../../interfaces";
import {Helper} from "../../helper";

export interface GridItem
{
  item: ActivityPageCommand | undefined;
  gridComponent: RemoteGridItemComponent;
  index: number;
}

@Component({
    selector: 'grid-button',
    imports: [],
    templateUrl: './remote-grid-item.component.html',
    styleUrl: './remote-grid-item.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class RemoteGridItemComponent implements AfterViewInit{
  editable: boolean = true;
  @Input("editable") set _editable(editable: boolean)
  {
    this.editable = editable;
    this.initView();
  }
  @Input({required: true}) source: RemoteGridItemComponent | undefined;
  @Input() item!: ActivityPageCommand;
  @Input() gridCommands: ActivityPageCommand[] = [];
  selectionMode: boolean = false;
  @Input("selectionMode") set _selectionMode(selectionMode: boolean)
  {
    this.selectionMode = selectionMode;
    this.initView();
  }
  @Input() runMode: boolean = false;
  selected = false;
  @Input('selected') set _selected(value: boolean | undefined) {
    if (value === undefined) return;
    this.selected = value;
  }
  @Output() sourceSelected = new EventEmitter<RemoteGridItemComponent>();
  @Output() destinationSelected = new EventEmitter<RemoteGridItemComponent>();
  @Output() itemClicked = new EventEmitter<RemoteGridItemComponent>();
  @ViewChild("griditem", {static: false}) gridItem: ElementRef<HTMLDivElement> | undefined;
  @Input() grid!: { width: number; height: number };

  constructor(private cdr:ChangeDetectorRef, private elRef: ElementRef) {
  }

  getIndex(): number
  {
    if (!this.gridCommands) return 0;
    return this.gridCommands.indexOf(this.item);
  }

  ngAfterViewInit(): void {
    this.initView();
  }

  initView(): void {
    if (this.gridItem?.nativeElement?.children)
    for (let i = 0; i < this.gridItem.nativeElement.children?.length; i++) {
      let child = this.gridItem?.nativeElement.children[i] as HTMLElement;
      if (!this.editable && !this.selectionMode)
        child.style.pointerEvents = 'auto';
      else
        child.style.pointerEvents = 'none';
    }
    this.cdr.detectChanges();
  }

  getClass(): string {
    if (this.selectionMode && !this.selected) return 'grid-item-selection';
    if (this.selectionMode && this.selected) return 'grid-item-selected';
    if (!this.editable) {
      if (Helper.isEmptyItem(this.item)) {
        if (this.runMode) return 'grid-item-run-static';
        return 'grid-item-static';
      }
      if (this.runMode) {
        if (this.item.type === "media_player") return 'grid-item-run-static';
        return 'grid-item-run';
      }
      return 'grid-item-clickable';
    }
    return 'grid-item';
  }

  isDraggable()
  {
    return this.editable && !this.selectionMode && !Helper.isEmptyItem(this.item);
  }

  clickItem(event: MouseEvent) {
    // console.debug("Click item", this.item);
    if (this.selectionMode) {
      if (Helper.isEmptyItem(this.item)) return;
      this.selected = !this.selected;
      this.itemClicked.emit(this)
      this.cdr.detectChanges();
      return;
    } else if (!this.editable)
    {
      if (Helper.isEmptyItem(this.item) || !this.item.command || typeof this.item.command === "string") return;
      this.itemClicked.emit(this)
      this.cdr.detectChanges();
      return;
    }
    this.itemClicked.emit(this)
    this.cdr.detectChanges();
  }

  handleDragStart(event: DragEvent){
    if (!this.editable || Helper.isEmptyItem(this.item)) {
      event.preventDefault();
      event.stopPropagation();
      this.cdr.detectChanges();
      return false;
    }
    this.gridItem!.nativeElement.classList.add('grid-item-dragging');
    if (event.dataTransfer)
    {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', this.gridItem!.nativeElement.innerHTML);
    }
    this.sourceSelected.emit(this);
    this.cdr.detectChanges();
    return true;
  }

  checkDraggableDestination(): boolean
  {
    if (!this.source) return false;
    if (Helper.isSameSize(this.source.item, this.item)) return true;
    if (!Helper.isEmptyItem(this.item)) return false;
    if (!Helper.checkItemOverflow(this.item.location.x, this.item.location.y,
      this.source.item.size.width, this.source.item.size.height, this.grid.width, this.grid.height)) return false;

    return Helper.checkItem(this.source.item, this.gridCommands, this.item.location.x, this.item.location.y,
      this.source.item.size.width, this.source.item.size.height);
  }

  handleDragOver(event: DragEvent){
    if (!this.source || this.source == this) return false;
    if (!this.checkDraggableDestination()) return;
    if (event.dataTransfer)
      event.dataTransfer.dropEffect = 'move';
    event.stopPropagation();
    event.preventDefault();
    this.cdr.detectChanges();
    return;
  }

  handleDragEnter(event: DragEvent) {
    if (!this.editable || !this.source || this.source == this) return;
    if (!this.checkDraggableDestination()) return;
    this.cdr.detectChanges();
    this.gridItem!.nativeElement.classList.add('over');
    event.stopPropagation();
    event.preventDefault();
    this.cdr.detectChanges();
  }

  handleDragLeave(event:DragEvent) {
    if (!this.editable) return;
    this.gridItem!.nativeElement.classList.remove('over');
    this.cdr.detectChanges();
  }

  invertElements(c1:  RemoteGridItemComponent, c2:  RemoteGridItemComponent)
  {
    let dummy = document.createElement("span")
    c1.elRef.nativeElement.before(dummy);
    c2.elRef.nativeElement.before(c1.elRef.nativeElement);
    dummy.replaceWith(c2.elRef.nativeElement);
  }

  handleDrop(event:DragEvent) {
    event.stopPropagation(); // stops the browser from redirecting.

    if (!this.editable) return;
    if (this.source?.gridItem && this.source.gridItem != this.gridItem) {
      // this.source.gridItem.nativeElement.innerHTML = this.gridItem!.nativeElement.innerHTML;
      // this.gridItem!.nativeElement.innerHTML = event.dataTransfer?.getData('text/html');
      this.invertElements(this.source, this);

      this.gridItem!.nativeElement.classList.remove('over');
      console.log(`Drop ${this.source.item.location.x} ${this.source.item.location.y} => ${this.item.location.x} ${this.item.location.y}`, event);
      const x = this.item.location.x;
      const y = this.item.location.y;

      this.item.location = {x: this.source.item.location.x, y: this.source.item.location.y};
      this.source.item.location = {x, y};
      this.destinationSelected.emit(this);
      this.cdr.detectChanges();
    }
    return false;
  }

  handleDragEnd(event:any) {
    if (this.gridItem?.nativeElement)
    {
      this.gridItem.nativeElement.classList.remove('over');
      this.gridItem.nativeElement.classList.remove('grid-item-dragging');
      this.cdr.detectChanges();
    }
  }
}
