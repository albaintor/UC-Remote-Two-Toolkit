import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemotePageListComponent } from './remote-page-list.component';

describe('ActivityPageListComponent', () => {
  let component: RemotePageListComponent;
  let fixture: ComponentFixture<RemotePageListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemotePageListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RemotePageListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
