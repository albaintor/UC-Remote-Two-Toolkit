import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MediaEntityComponent } from './media-entity.component';

describe('MediaEntityComponent', () => {
  let component: MediaEntityComponent;
  let fixture: ComponentFixture<MediaEntityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaEntityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MediaEntityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
