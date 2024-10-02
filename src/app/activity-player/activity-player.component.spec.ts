import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityPlayerComponent } from './activity-player.component';

describe('ActivityPlayerComponent', () => {
  let component: ActivityPlayerComponent;
  let fixture: ComponentFixture<ActivityPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityPlayerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityPlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
