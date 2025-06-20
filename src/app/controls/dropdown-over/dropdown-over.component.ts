import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output, TemplateRef,
  ViewEncapsulation
} from '@angular/core';
import {NgIf, NgTemplateOutlet} from "@angular/common";
import {ProgressBarModule} from "primeng/progressbar";
import {SliderModule} from "primeng/slider";
import {SelectModule} from "primeng/select";
import {FormsModule} from "@angular/forms";

@Component({
    selector: 'app-select-over',
    imports: [
        NgIf,
        ProgressBarModule,
        SliderModule,
        SelectModule,
        FormsModule,
        NgTemplateOutlet
    ],
    templateUrl: './dropdown-over.component.html',
    styleUrl: './dropdown-over.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class DropdownOverComponent {
  value: any | undefined;
  formattedOptions: { value: any; label: string }[] = [];
  @Input("value") set _value(value: any | undefined) {
    this.value = value;
    this.updateSelection();
    this.cdr.detectChanges();
  }
  @Output() valueChange = new EventEmitter<number>();
  options: {value: any; label: string}[] | string[] | undefined;
  @Input("options") set _options(options: {value: any; label: string}[] | string[] | undefined) {
    if (this.options == options) return;
    this.options = options;
    if (options?.[0].hasOwnProperty('label') ) {
      this.formattedOptions = options as {value: any; label: string}[];
    } else if (options) {
      this.formattedOptions = options.map(item => {
        return {label: item as string, value: item};
      })
    }
    this.updateSelection();
  }
  @Input() editable = true;
  @Input() textTemplate : TemplateRef<HTMLAreaElement> | undefined;
  selectedValue: {value: any; label: string} | undefined;


  updateSelection()
  {
    if (this.value && this.options)
    {
      this.selectedValue = this.formattedOptions.find(item => item.value === this.value);
      this.cdr.detectChanges();
    }
  }

  constructor(private cdr:ChangeDetectorRef) {
  }

  valueUpdate(value: {value: any; label: string} | undefined)
  {
    if (!this.options || this.options.length == 0) return;
    if (!value) return;
    this.valueChange.emit(value.value);
  }

}
