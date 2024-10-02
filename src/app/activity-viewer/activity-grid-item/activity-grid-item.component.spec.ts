import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityGridItemComponent } from './activity-grid-item.component';

describe('ActivityGridComponent', () => {
  let component: ActivityGridItemComponent;
  let fixture: ComponentFixture<ActivityGridItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityGridItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityGridItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
