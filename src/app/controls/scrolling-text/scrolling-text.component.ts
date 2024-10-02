import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, ElementRef,
  Input, ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {NgIf} from "@angular/common";
import {Remote} from "../../interfaces";

@Component({
  selector: 'app-scrolling-text',
  standalone: true,
  imports: [
    NgIf
  ],
  templateUrl: './scrolling-text.component.html',
  styleUrl: './scrolling-text.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ScrollingTextComponent implements AfterViewInit {
  text: string | undefined;
  @Input("text") set _text(value: string | undefined) {
    this.text = value;
    this.cdr.detectChanges();
    this.updateClass();
  }
  @ViewChild("textContainer", {static: false}) textContainer: ElementRef<HTMLDivElement> | undefined;
  @ViewChild("textContent", {static: false}) textContent: ElementRef<HTMLDivElement> | undefined;

  constructor(private cdr:ChangeDetectorRef) {
  }

  ngAfterViewInit(): void {
    this.updateClass();
  }

  updateClass()
  {
    if (!this.textContainer || !this.textContent) return;
    if (this.textContainer.nativeElement.clientWidth < this.textContent.nativeElement.clientWidth + 15) {
      this.textContent.nativeElement.classList.add("animate");
    }
    else {
      this.textContent.nativeElement.classList.remove("animate");
    }
    this.cdr.detectChanges();
  }
}
