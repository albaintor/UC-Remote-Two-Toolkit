import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, ElementRef,
  EventEmitter,
  Input,
  Output, ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {NgForOf, NgIf} from "@angular/common";

interface Indexes
{
  index: number;
  current: boolean
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [
    NgIf,
    NgForOf
  ],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PaginationComponent implements AfterViewInit {
  numberOfPages = 0;
  @Input("numberOfPages") set _numberOfPages(value: number) {
    this.numberOfPages = value;
    this.reset();
  }
  displayedIndexes = 4;
  @Input("displayedIndexes") set _displayedIndexes(value: number) {
    if (value < 3) value = 3;
    this.displayedIndexes = value;
    this.reset();
  }
  currentIndex = 0;
  @Input("currentIndex") set _currentIndex(value: number) {
    this.currentIndex = value;
    this.update();
  }
  @Output() onIndexChange = new EventEmitter<number>();
  @ViewChild("paginationCollection", {static: false}) paginationCollection: ElementRef<HTMLDivElement> | undefined;
  @ViewChild("paginationContainer", {static: false}) paginationContainer: ElementRef<HTMLDivElement> | undefined;
  indexes: Indexes[] = [];
  dotSize = 8;
  @Input() smallSizeMode = false;

  constructor(private cdr: ChangeDetectorRef) {}

  update()
  {
    if (this.indexes.length == 0 || this.currentIndex >= this.indexes.length) {
      this.reset();
    }
    if (this.numberOfPages <= 1) return;
    this.indexes.forEach(index => {
      index.current = index.index == this.currentIndex;
    })
    const width = this.paginationContainer?.nativeElement.clientWidth;
    if (!width) return;
    const displayedItems = Math.min(this.displayedIndexes, this.indexes.length);
    const itemWidth = Math.round((width - 10)/displayedItems);

    let direction = true;
    let indexRight = this.currentIndex + 1;
    let indexLeft = this.currentIndex -1;
    const indexesLeft: Indexes[] = [];
    const indexesRight: Indexes[] = [];
    for (let i=0; i<this.displayedIndexes-1; i++)
    {
      if (direction && indexRight < this.numberOfPages) {
        indexesRight.push({index: indexRight, current: false});
        indexRight++
      } else if (indexLeft >= 0) {
        indexesLeft.push({index: indexLeft, current: false});
        indexLeft--;
      }
      direction = !direction;
    }
    const newIndex = this.currentIndex-indexesLeft.length;

    if (this.paginationCollection?.nativeElement && this.currentIndex >= 0) {
      this.paginationCollection.nativeElement.setAttribute("style",
        `gap:0 ${(itemWidth-this.dotSize)}px;transform: translate3d(-${newIndex * itemWidth}px, 0px, 0px`);
    }
    this.cdr.detectChanges();
  }

  reset()
  {
    this.indexes = [];
    if (this.numberOfPages <= 1) return;
    for (let i=0; i < this.numberOfPages; i++) {
      this.indexes.push({index:i, current: (i === this.currentIndex)});
    }
    this.update();
    this.cdr.detectChanges();
  }

  init2()
  {
    this.indexes = [];
    if (this.numberOfPages <= 1) return;
    let direction = true;
    let indexRight = this.currentIndex + 1;
    let indexLeft = this.currentIndex -1;
    const indexesLeft: Indexes[] = [];
    const indexesRight: Indexes[] = [];

    for (let i=0; i<this.displayedIndexes-1; i++)
    {
      if (direction && indexRight < this.numberOfPages) {
        indexesRight.push({index: indexRight, current: false});
        indexRight++
      } else if (indexLeft >= 0) {
        indexesLeft.push({index: indexLeft, current: false});
        indexLeft--;
      }
      direction = !direction;
    }
    this.indexes = [...indexesLeft.reverse(), {index: this.currentIndex, current: true}, ...indexesRight];
    this.cdr.detectChanges();
  }

  selectIndex($event: MouseEvent, index: Indexes) {
    this.update();
    this.onIndexChange.emit(index.index);
  }

  ngAfterViewInit(): void {
    this.update();
    if (this.paginationContainer)
      new MutationObserver((mutationList, observer) => {
        this.update();
        observer.disconnect();
      }).observe(this.paginationContainer?.nativeElement, { attributes: true });
  }
}
