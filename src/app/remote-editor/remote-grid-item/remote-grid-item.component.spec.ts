import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemoteGridItemComponent } from './remote-grid-item.component';

describe('ActivityGridComponent', () => {
  let component: RemoteGridItemComponent;
  let fixture: ComponentFixture<RemoteGridItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemoteGridItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RemoteGridItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
