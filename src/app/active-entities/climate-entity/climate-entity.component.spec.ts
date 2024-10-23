import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClimateEntityComponent } from './climate-entity.component';

describe('ClimateEntityComponent', () => {
  let component: ClimateEntityComponent;
  let fixture: ComponentFixture<ClimateEntityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClimateEntityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClimateEntityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
