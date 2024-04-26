import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemoteOperationsComponent } from './remote-operations.component';

describe('RemoteOperationsComponent', () => {
  let component: RemoteOperationsComponent;
  let fixture: ComponentFixture<RemoteOperationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemoteOperationsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RemoteOperationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
