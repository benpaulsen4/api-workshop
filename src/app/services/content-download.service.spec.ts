import { TestBed } from '@angular/core/testing';

import { ContentDownloadService } from './content-download.service';

describe('ContentDownloadService', () => {
  let service: ContentDownloadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContentDownloadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
