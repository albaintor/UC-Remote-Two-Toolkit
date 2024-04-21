import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemoteBrowserComponent } from './remote-browser.component';

describe('RemotBrowserComponent', () => {
  let component: RemoteBrowserComponent;
  let fixture: ComponentFixture<RemoteBrowserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemoteBrowserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RemoteBrowserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
