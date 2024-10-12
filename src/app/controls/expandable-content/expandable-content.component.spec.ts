import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpandableContentComponent } from './expandable-content.component';

describe('ExpandableContentComponent', () => {
  let component: ExpandableContentComponent;
  let fixture: ComponentFixture<ExpandableContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpandableContentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpandableContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
