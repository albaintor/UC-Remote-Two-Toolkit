import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemoteGridComponent } from './remote-grid.component';

describe('ActivityGridComponent', () => {
  let component: RemoteGridComponent;
  let fixture: ComponentFixture<RemoteGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemoteGridComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RemoteGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
