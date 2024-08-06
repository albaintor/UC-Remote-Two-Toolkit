import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import {OverlayPanel} from "primeng/overlaypanel";
import {ActivityPageCommand} from "../../interfaces";
import {Helper} from "../../helper";

export interface GridItem
{
  item: ActivityPageCommand;
  gridItem: ElementRef;
  index: number;
}

@Component({
  selector: 'grid-button',
  standalone: true,
  imports: [],
  templateUrl: './activity-grid.component.html',
  styleUrl: './activity-grid.component.css'
})
export class ActivityGridComponent  implements AfterViewInit{
  // @Input() items: HTMLElement[];
  @Input() editable: boolean = true;
  @Input({required: true}) source: GridItem | undefined;
  @Input() item!: ActivityPageCommand | null;
  @Input() index!: number;
  @Output() sourceSelected = new EventEmitter<GridItem>();
  @Output() destinationSelected = new EventEmitter<GridItem>();
  @Output() itemClicked = new EventEmitter<GridItem>();
  @ViewChild("griditem", {static: false}) gridItem: ElementRef | undefined;
  @Input() grid!: { width: number; height: number };

  ngAfterViewInit(): void {
    if (!this.editable) return;
    for (let i = 0; i < this.gridItem?.nativeElement.children?.length; i++) {
      let child = this.gridItem?.nativeElement.children[i];
      child.style['pointer-events'] = 'none';
    }
  }

  @HostListener('click', ['$event']) onClick(event: any) {
    if (!this.editable) return;
    this.itemClicked.emit({gridItem: this.gridItem!,
      item: this.item!, index: this.index})
  }

  @HostListener('dragstart', ['$event']) handleDragStart(event: any){
    if (!this.editable) return;
    this.gridItem!.nativeElement.style.opacity = '0.4';
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', this.gridItem!.nativeElement.innerHTML);
    this.sourceSelected.emit({gridItem: this.gridItem!,
      item: this.item!, index: this.index});
  }

  @HostListener('dragover', ['$event']) handleDragOver(event: any){
    if (event.preventDefault) {
      event.preventDefault();
    }
    if (this.source?.item != this.item && this.source?.item?.size)
    {
      //TODO calculate x,y position of griditem
      /*let sourceX = this.gridSource?.index! % this.currentPage?.grid.width!;
      let sourceY = Math.floor(this.gridSource?.index! / this.currentPage?.grid.width!);
      let destinationX = $event.index! % this.currentPage?.grid.width!;
      let destinationY = Math.floor($event.index! / this.currentPage?.grid.width!);*/
      //pointer-events: none;
    }
    event.dataTransfer.dropEffect = 'move';
    return false;
  }

  @HostListener('dragenter', ['$event']) handleDragEnter(event: any) {
    if (!this.editable) return;
    this.gridItem!.nativeElement.classList.add('over');
  }

  @HostListener('dragleave', ['$event']) handleDragLeave(event:any) {
    if (!this.editable) return;
    this.gridItem!.nativeElement.classList.remove('over');
  }

  @HostListener('drop', ['$event']) handleDrop(event:any) {
    if (event.stopPropagation) {
      event.stopPropagation(); // stops the browser from redirecting.
    }
    if (!this.editable) return;
    if (this.source && this.source.gridItem != this.gridItem) {
      this.source.gridItem.nativeElement.innerHTML = this.gridItem!.nativeElement.innerHTML;
      this.gridItem!.nativeElement.innerHTML = event.dataTransfer.getData('text/html');
      this.gridItem!.nativeElement.classList.remove('over');
      console.log("DROP", event);
      this.destinationSelected.emit({gridItem: this.gridItem!.nativeElement,
        item: this.item!, index: this.index});
    }
    return false;
  }

  @HostListener('dragend', ['$event']) handleDragEnd(event:any) {
    this.gridItem!.nativeElement.style.opacity = '1';
    this.gridItem!.nativeElement.classList.remove('over');
    // this.source?.classList.remove('over');
    // this.items.forEach(item => {
    //   item.classList.remove('over');
    // });
  }
}

// customElements.define('grid-button', ActivityGridComponent, { extends: 'div' });
