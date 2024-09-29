import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropdownOverComponent } from './dropdown-over.component';

describe('DropdownOverComponent', () => {
  let component: DropdownOverComponent;
  let fixture: ComponentFixture<DropdownOverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownOverComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DropdownOverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
