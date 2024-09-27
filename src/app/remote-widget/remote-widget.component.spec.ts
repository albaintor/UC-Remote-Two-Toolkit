import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemoteWidgetComponent } from './remote-widget.component';

describe('RemoteWidgetComponent', () => {
  let component: RemoteWidgetComponent;
  let fixture: ComponentFixture<RemoteWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemoteWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RemoteWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
