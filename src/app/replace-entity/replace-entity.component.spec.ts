import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReplaceEntityComponent } from './replace-entity.component';

describe('RenameEntityComponent', () => {
  let component: ReplaceEntityComponent;
  let fixture: ComponentFixture<ReplaceEntityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReplaceEntityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReplaceEntityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
