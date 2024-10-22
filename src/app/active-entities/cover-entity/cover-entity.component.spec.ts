import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoverEntityComponent } from './cover-entity.component';

describe('CoverEntityComponent', () => {
  let component: CoverEntityComponent;
  let fixture: ComponentFixture<CoverEntityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoverEntityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoverEntityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
