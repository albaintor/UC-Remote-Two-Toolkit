import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, EventEmitter,
  forwardRef,
  Input, OnInit, Output,
  ViewEncapsulation
} from '@angular/core';
import {NgIf} from "@angular/common";
import {PrimeTemplate} from "primeng/api";
import {ProgressBarModule} from "primeng/progressbar";
import {SliderModule} from "primeng/slider";
import {FormsModule, NG_VALUE_ACCESSOR} from "@angular/forms";
import {debounceTime, Subject, Subscription} from "rxjs";

@Component({
  selector: 'app-slider',
  standalone: true,
  imports: [
    NgIf,
    PrimeTemplate,
    ProgressBarModule,
    SliderModule,
    FormsModule
  ],
  templateUrl: './slider.component.html',
  styleUrl: './slider.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SliderComponent),
    multi: true
  }]
})
export class SliderComponent implements OnInit {
  @Input() value: number | undefined;
  @Output() valueChange = new EventEmitter<number>();
  @Input() textValue: string | undefined;
  @Input() editable = true;
  @Input() debounceTime = 500;
  private sliderSubject: Subject<number> = new Subject();
  private subscription = new Subscription();
  @Input() max: string | undefined;

  constructor( private cdr:ChangeDetectorRef) { }

  ngOnInit(): void {
    this.subscription.add(
      this.sliderSubject.pipe(debounceTime(this.debounceTime)).subscribe(value => {
        this.valueChange.emit(value)
      })
    );
  }

  valueUpdate(value: number | undefined)
  {
    if (!value) return;
    this.sliderSubject.next(value);
  }

}
