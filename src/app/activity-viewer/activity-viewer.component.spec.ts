import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityViewerComponent } from './activity-viewer.component';

describe('ActivityEditorComponent', () => {
  let component: ActivityViewerComponent;
  let fixture: ComponentFixture<ActivityViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
