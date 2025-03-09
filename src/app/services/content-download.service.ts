import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ContentDownloadService {
  constructor() {}

  public downloadFromTextData(
    data: string,
    filename: string,
    contentType: string,
  ) {
    const blob = new Blob([data], { type: contentType });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    link.remove();
  }
}
