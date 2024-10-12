import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  TemplateRef,
  ViewEncapsulation
} from '@angular/core';
import {NgIf, NgTemplateOutlet} from "@angular/common";
import {Remote} from "../../interfaces";

@Component({
  selector: 'app-expandable-content',
  standalone: true,
  imports: [
    NgIf,
    NgTemplateOutlet
  ],
  templateUrl: './expandable-content.component.html',
  styleUrl: './expandable-content.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ExpandableContentComponent {
  @Input() content : TemplateRef<HTMLAreaElement> | undefined;
  @Input() collapsed = false;
  @Input() collapsedTitle : TemplateRef<HTMLAreaElement> | undefined;

  constructor(private cdr: ChangeDetectorRef) {
  }

  switch() {
    this.collapsed = !this.collapsed;
    this.cdr.detectChanges();
  }
}
