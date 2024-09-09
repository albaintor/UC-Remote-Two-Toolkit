import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivitySequenceComponent } from './activity-sequence.component';

describe('ActivitySequenceComponent', () => {
  let component: ActivitySequenceComponent;
  let fixture: ComponentFixture<ActivitySequenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivitySequenceComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ActivitySequenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
