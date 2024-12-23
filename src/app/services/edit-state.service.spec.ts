import { TestBed } from '@angular/core/testing';

import { EditStateService } from './edit-state.service';

describe('EditStateService', () => {
  let service: EditStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EditStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
