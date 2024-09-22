import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityPageListComponent } from './activity-page-list.component';

describe('ActivityPageListComponent', () => {
  let component: ActivityPageListComponent;
  let fixture: ComponentFixture<ActivityPageListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityPageListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityPageListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
