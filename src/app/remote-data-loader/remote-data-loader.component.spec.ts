import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemoteDataLoaderComponent } from './remote-data-loader.component';

describe('RemoteDataLoaderComponent', () => {
  let component: RemoteDataLoaderComponent;
  let fixture: ComponentFixture<RemoteDataLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemoteDataLoaderComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RemoteDataLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
