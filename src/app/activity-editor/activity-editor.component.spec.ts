import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityEditorComponent } from './activity-editor.component';

describe('ActivityEditorComponent', () => {
  let component: ActivityEditorComponent;
  let fixture: ComponentFixture<ActivityEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityEditorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ActivityEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
