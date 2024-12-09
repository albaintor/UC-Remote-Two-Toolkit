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
    this.updateClass();
  }
  textClass: string | undefined;
  @Input("textClass") set _textClass(textClass: string | undefined) {
    this.textClass = textClass;
    this.updateClass();
  }
  textStyle: string | undefined;
  @Input("textStyle") set _textStyle(textStyle: string | undefined)
  {
    this.textStyle = textStyle;
    this.cdr.detectChanges();
    this.updateClass();
  }
  @ViewChild("textContainer", {static: false}) textContainer: ElementRef<HTMLDivElement> | undefined;
  @ViewChild("textContent", {static: false}) textContent: ElementRef<HTMLDivElement> | undefined;

  constructor(private elementRef: ElementRef, private cdr:ChangeDetectorRef) {
  }

  ngAfterViewInit(): void {
    this.updateClass();
  }

  updateClass()
  {
    if (!this.textContainer?.nativeElement?.clientWidth || !this.textContent?.nativeElement?.clientWidth) return;
    if (this.textClass) this.textContent.nativeElement.classList.add(this.textClass);
    this.cdr.detectChanges();
    const style = this.textStyle ? this.textStyle : "";
    if (this.textContainer.nativeElement.clientWidth < this.textContent.nativeElement.clientWidth + 15) {
      this.textContent.nativeElement.classList.add("animate");
      const speed =  Math.floor(10*this.textContent.nativeElement.clientWidth / this.textContainer.nativeElement.clientWidth);
      this.textContent.nativeElement.setAttribute("style", `animation: leftright ${speed}s infinite alternate ease-in-out;${style}`);
    }
    else {
      this.textContent.nativeElement.classList.remove("animate");
      this.textContent.nativeElement.setAttribute("style", style);
    }

    this.cdr.detectChanges();
  }
}
