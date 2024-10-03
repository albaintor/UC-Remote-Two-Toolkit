import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiivtyMediaEntityComponent } from './actiivty-media-entity.component';

describe('ActiivtyMediaEntityComponent', () => {
  let component: ActiivtyMediaEntityComponent;
  let fixture: ComponentFixture<ActiivtyMediaEntityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiivtyMediaEntityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActiivtyMediaEntityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
