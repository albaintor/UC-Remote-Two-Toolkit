import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
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
export class PaginationComponent {
  numberOfPages = 0;
  @Input("numberOfPages") set _numberOfPages(value: number) {
    this.numberOfPages = value;
    this.init();
  }
  displayedIndexes = 4;
  @Input("displayedIndexes") set _displayedIndexes(value: number) {
    if (value < 3) value = 3;
    this.displayedIndexes = value;
    this.init();
  }
  currentIndex = 0;
  @Input("currentIndex") set _currentIndex(value: number) {
    this.currentIndex = value;
    this.init();
  }
  @Output() onIndexChange = new EventEmitter<number>();
  indexes: Indexes[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  init()
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
    this.onIndexChange.emit(index.index);
  }
}
