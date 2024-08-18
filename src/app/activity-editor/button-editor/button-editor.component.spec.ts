import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonEditorComponent } from './button-editor.component';

describe('ButtonEditorComponent', () => {
  let component: ButtonEditorComponent;
  let fixture: ComponentFixture<ButtonEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonEditorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ButtonEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
