import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LightEntityComponent } from './light-entity.component';

describe('LightEntityComponent', () => {
  let component: LightEntityComponent;
  let fixture: ComponentFixture<LightEntityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LightEntityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LightEntityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
