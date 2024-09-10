import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageMapComponent } from './image-map.component';

describe('ImageMapComponent', () => {
  let component: ImageMapComponent;
  let fixture: ComponentFixture<ImageMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImageMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
