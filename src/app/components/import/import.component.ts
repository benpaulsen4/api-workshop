import { Component, signal } from '@angular/core';
import {
  ImportErrorCode,
  JsonSchemaToSchemaImportService,
} from '../../services/json-schema-to-schema-import.service';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';

@Component({
  selector: 'app-import',
  imports: [Button],
  providers: [JsonSchemaToSchemaImportService],
  templateUrl: './import.component.html',
  styleUrl: './import.component.scss',
})
export class ImportComponent {
  readonly importLoading = signal(false);

  constructor(
    private importService: JsonSchemaToSchemaImportService,
    private messageService: MessageService,
  ) {}

  async onImport(inputEvent: Event) {
    this.importLoading.set(true);
    try {
      const target = inputEvent.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      const contents = await file.text();

      const importResult = await this.importService.import(contents);

      if (importResult.status === 'errored') {
        let message = '';

        switch (importResult.error!.message) {
          case ImportErrorCode.InvalidJson:
            message = 'The file provided is not valid JSON';
            break;
          case ImportErrorCode.InvalidSchema:
            message = 'The file provided is not a valid JSON schema';
            break;
          case ImportErrorCode.SchemaNotObject:
            message =
              'The file provided may contain a JSON schema, but the top level is missing a type declaration or the type is not an object';
            break;
        }

        this.messageService.add({
          severity: 'error',
          summary: 'Import failed',
          detail: message,
        });
      } else {
        const results = importResult.results!;

        this.messageService.add({
          severity: 'success',
          summary: 'Import completed',
          detail: `Successfully imported ${results.schemas.length ? results.schemas.length + ' schema(s)' : ''} ${results.enums.length && results.schemas.length ? 'and' : ''} ${results.enums.length ? results.enums.length + ' enum(s)' : ''}`,
        });
      }
    } catch (e) {
      console.error(e);
      this.messageService.add({
        severity: 'error',
        summary: 'Import failed',
        detail: 'An unknown error occurred. Maybe make an issue on Github?',
      });
    } finally {
      this.importLoading.set(false);
    }
  }
}
