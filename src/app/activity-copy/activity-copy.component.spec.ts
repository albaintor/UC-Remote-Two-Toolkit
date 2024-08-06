import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityCopyComponent } from './activity-copy.component';

describe('ActivityCopyComponent', () => {
  let component: ActivityCopyComponent;
  let fixture: ComponentFixture<ActivityCopyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityCopyComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ActivityCopyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
