import {
  AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import {ActivityPageCommand} from "../../interfaces";
import {Helper} from "../../helper";

export interface GridItem
{
  item: ActivityPageCommand | undefined;
  gridComponent: ActivityGridItemComponent;
  index: number;
}

@Component({
  selector: 'grid-button',
  standalone: true,
  imports: [],
  templateUrl: './activity-grid-item.component.html',
  styleUrl: './activity-grid-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityGridItemComponent implements AfterViewInit{
  editable: boolean = true;
  @Input("editable") set _editable(editable: boolean)
  {
    this.editable = editable;
    this.initView();
  }
  @Input({required: true}) source: ActivityGridItemComponent | undefined;
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
  @Output() sourceSelected = new EventEmitter<ActivityGridItemComponent>();
  @Output() destinationSelected = new EventEmitter<ActivityGridItemComponent>();
  @Output() itemClicked = new EventEmitter<ActivityGridItemComponent>();
  @ViewChild("griditem", {static: false}) gridItem: ElementRef | undefined;
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
    for (let i = 0; i < this.gridItem?.nativeElement.children?.length; i++) {
      let child = this.gridItem?.nativeElement.children[i];
      if (!this.editable && !this.selectionMode)
        child.style['pointer-events'] = 'auto';
      else
        child.style['pointer-events'] = 'none';
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

  onClick(event: MouseEvent) {
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
    this.gridItem!.nativeElement.style.opacity = '0.4';
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

  invertElements(c1:  ActivityGridItemComponent, c2:  ActivityGridItemComponent)
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
    this.gridItem!.nativeElement.style.opacity = '1';
    this.gridItem!.nativeElement.classList.remove('over');
    this.cdr.detectChanges();
  }
}
