import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemoteRegistrationComponent } from './remote-registration.component';

describe('RemoteRegistrationComponent', () => {
  let component: RemoteRegistrationComponent;
  let fixture: ComponentFixture<RemoteRegistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemoteRegistrationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RemoteRegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
