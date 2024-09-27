import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScrollingTextComponent } from './scrolling-text.component';

describe('ScrollingTextComponent', () => {
  let component: ScrollingTextComponent;
  let fixture: ComponentFixture<ScrollingTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScrollingTextComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScrollingTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
