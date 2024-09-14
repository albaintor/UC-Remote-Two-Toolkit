import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivitySyncComponent } from './activity-sync.component';

describe('ActivitySyncComponent', () => {
  let component: ActivitySyncComponent;
  let fixture: ComponentFixture<ActivitySyncComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivitySyncComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivitySyncComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
