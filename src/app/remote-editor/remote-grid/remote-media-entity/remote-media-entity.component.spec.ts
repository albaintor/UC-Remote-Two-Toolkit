import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemoteMediaEntityComponent } from './remote-media-entity.component';

describe('ActiivtyMediaEntityComponent', () => {
  let component: RemoteMediaEntityComponent;
  let fixture: ComponentFixture<RemoteMediaEntityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemoteMediaEntityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RemoteMediaEntityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
