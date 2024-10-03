import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityMediaEntityComponent } from './activity-media-entity.component';

describe('ActiivtyMediaEntityComponent', () => {
  let component: ActivityMediaEntityComponent;
  let fixture: ComponentFixture<ActivityMediaEntityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityMediaEntityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityMediaEntityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
