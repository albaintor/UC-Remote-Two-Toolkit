import {
  AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import {ActivityPageCommand} from "../../interfaces";
import {Helper} from "../../helper";

export interface GridItem
{
  item: ActivityPageCommand | undefined;
  gridComponent: ActivityGridComponent;
  index: number;
}

@Component({
  selector: 'grid-button',
  standalone: true,
  imports: [],
  templateUrl: './activity-grid.component.html',
  styleUrl: './activity-grid.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityGridComponent  implements AfterViewInit{
  // @Input() items: HTMLElement[];
  @Input() editable: boolean = true;
  @Input({required: true}) source: ActivityGridComponent | undefined;
  @Input() item!: ActivityPageCommand;
  // @Input() index!: number;
  @Input() gridCommands: ActivityPageCommand[] = [];
  @Output() sourceSelected = new EventEmitter<ActivityGridComponent>();
  @Output() destinationSelected = new EventEmitter<ActivityGridComponent>();
  @Output() itemClicked = new EventEmitter<ActivityGridComponent>();
  @ViewChild("griditem", {static: false}) gridItem: ElementRef | undefined;
  @Input() grid!: { width: number; height: number };

  constructor(private cdr:ChangeDetectorRef) {
  }

  getIndex(): number
  {
    if (!this.gridCommands) return 0;
    return this.gridCommands.indexOf(this.item);
  }

  ngAfterViewInit(): void {
    if (!this.editable) return;
    for (let i = 0; i < this.gridItem?.nativeElement.children?.length; i++) {
      let child = this.gridItem?.nativeElement.children[i];
      child.style['pointer-events'] = 'none';
    }
    this.cdr.detectChanges();
  }

  @HostListener('click', ['$event']) onClick(event: any) {
    if (!this.editable) return;
    this.itemClicked.emit(this)
    this.cdr.detectChanges();
  }

  @HostListener('dragstart', ['$event']) handleDragStart(event: any){
    if (!this.editable || Helper.isEmptyItem(this.item)) return;
    this.gridItem!.nativeElement.style.opacity = '0.4';
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', this.gridItem!.nativeElement.innerHTML);
    this.sourceSelected.emit(this);
    this.cdr.detectChanges();
  }


  checkDraggableDestination(): boolean
  {
    if (!this.source) return false;
    if (Helper.isSameSize(this.source.item, this.item)) return true;
    if (!Helper.isEmptyItem(this.item)) return false;
    return Helper.checkItem(this.source.item, this.gridCommands, this.item.location.x, this.item.location.y,
      this.source.item.size.width, this.source.item.size.height);
  }


  @HostListener('dragover', ['$event']) handleDragOver(event: any){
    if (!this.source) return false;
    if (!this.checkDraggableDestination()) return;
    if (event.preventDefault) {
      event.preventDefault();
    }
    event.dataTransfer.dropEffect = 'move';
    this.cdr.detectChanges();
    return;
  }

  @HostListener('dragenter', ['$event']) handleDragEnter(event: any) {
    if (!this.editable || !this.source || this.source == this) return;
    console.error("dragenter", event);
    if (!this.checkDraggableDestination()) return;
    this.cdr.detectChanges();
    this.gridItem!.nativeElement.classList.add('over');
    event.preventDefault();
    this.cdr.detectChanges();
  }

  @HostListener('dragleave', ['$event']) handleDragLeave(event:any) {
    if (!this.editable) return;
    this.gridItem!.nativeElement.classList.remove('over');
    this.cdr.detectChanges();
  }

  @HostListener('drop', ['$event']) handleDrop(event:any) {
    if (event.stopPropagation) {
      event.stopPropagation(); // stops the browser from redirecting.
    }
    if (!this.editable) return;
    if (this.source?.gridItem && this.source.gridItem != this.gridItem) {
      /*this.source.gridItem.nativeElement.innerHTML = this.gridItem!.nativeElement.innerHTML;
      this.gridItem!.nativeElement.innerHTML = event.dataTransfer.getData('text/html');*/
      this.gridItem!.nativeElement.classList.remove('over');
      console.log(`DROP ${this.source.item.location} => ${this.item.location}`, event);
      const x = this.item.location.x;
      const y = this.item.location.y;

      this.item.location = {x: this.source.item.location.x, y: this.source.item.location.y};
      this.source.item.location = {x, y};
      this.destinationSelected.emit(this);
      this.cdr.detectChanges();
    }
    return false;
  }

  @HostListener('dragend', ['$event']) handleDragEnd(event:any) {
    this.gridItem!.nativeElement.style.opacity = '1';
    this.gridItem!.nativeElement.classList.remove('over');
    this.cdr.detectChanges();
    // this.source?.classList.remove('over');
    // this.items.forEach(item => {
    //   item.classList.remove('over');
    // });
  }
}

// customElements.define('grid-button', ActivityGridComponent, { extends: 'div' });
