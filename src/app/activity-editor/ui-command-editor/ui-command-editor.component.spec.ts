import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UiCommandEditorComponent } from './ui-command-editor.component';

describe('CommandEditorComponent', () => {
  let component: UiCommandEditorComponent;
  let fixture: ComponentFixture<UiCommandEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiCommandEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UiCommandEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
