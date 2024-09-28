import { TestBed } from '@angular/core/testing';

import { RemoteWebsocketService } from './remote-websocket.service';

describe('RemoteWebsocketService', () => {
  let service: RemoteWebsocketService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RemoteWebsocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
