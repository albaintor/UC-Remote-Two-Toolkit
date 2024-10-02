import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityButtonsComponent } from './activity-buttons.component';

describe('ActivityButtonsComponent', () => {
  let component: ActivityButtonsComponent;
  let fixture: ComponentFixture<ActivityButtonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityButtonsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
