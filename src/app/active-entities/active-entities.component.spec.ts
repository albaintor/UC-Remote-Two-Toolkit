import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveEntitiesComponent } from './active-entities.component';

describe('ActiveEntitiesComponent', () => {
  let component: ActiveEntitiesComponent;
  let fixture: ComponentFixture<ActiveEntitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveEntitiesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActiveEntitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
