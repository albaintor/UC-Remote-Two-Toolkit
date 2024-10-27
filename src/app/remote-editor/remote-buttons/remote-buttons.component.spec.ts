import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemoteButtonsComponent } from './remote-buttons.component';

describe('ActivityButtonsComponent', () => {
  let component: RemoteButtonsComponent;
  let fixture: ComponentFixture<RemoteButtonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemoteButtonsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RemoteButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
