import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityEntitiesComponent } from './activity-entities.component';

describe('ActivityEntitiesComponent', () => {
  let component: ActivityEntitiesComponent;
  let fixture: ComponentFixture<ActivityEntitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityEntitiesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityEntitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
