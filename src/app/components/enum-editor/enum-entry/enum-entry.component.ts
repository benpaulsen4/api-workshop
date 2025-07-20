import { Component, input, output, signal, viewChild } from '@angular/core';
import { Button } from 'primeng/button';
import { Popover } from 'primeng/popover';
import { RenameEntryComponent } from '../rename-entry/rename-entry.component';
import { RevalueEntryComponent } from '../revalue-entry/revalue-entry.component';
import { EnumEntry } from '../../../models/enum';
import { Observable } from 'rxjs';
import {
  EditAction,
  RemoveEnumEntry,
  UpdateEnumEntry,
} from '../../../models/edit-actions';
import { MetadataEditorComponent } from '../../metadata-editor/metadata-editor.component';
import { Metadata } from '../../../models/named-entity';
import { Tag } from 'primeng/tag';

@Component({
  selector: 'app-enum-entry',
  standalone: true,
  imports: [
    Button,
    Popover,
    RenameEntryComponent,
    RevalueEntryComponent,
    MetadataEditorComponent,
    Tag,
  ],
  templateUrl: './enum-entry.component.html',
  styleUrl: './enum-entry.component.scss',
})
export class EnumEntryComponent {
  readonly entry = input.required<EnumEntry>();
  readonly enumType = input.required<'string' | 'int'>();
  readonly existingEntryNames = input<Observable<string[]>>();
  readonly existingEntryValues = input<Observable<(string | number)[]>>();

  readonly entryUpdated = output<EditAction>();

  readonly editingMetadata = signal(false);

  readonly revaluePopup = viewChild<Popover>('revalue');
  readonly metadataEditor = viewChild<Popover>('metadataEditor');

  onDeleteEntry() {
    this.entryUpdated.emit(new RemoveEnumEntry(this.entry()));
  }

  onRenameEntry(newName: string) {
    const updatedEntry = { ...this.entry(), name: newName };
    this.entryUpdated.emit(new UpdateEnumEntry(this.entry(), updatedEntry));
  }

  onUpdateValue(newValue: string | number) {
    const updatedEntry = { ...this.entry(), value: newValue };
    this.entryUpdated.emit(new UpdateEnumEntry(this.entry(), updatedEntry));
    this.revaluePopup()?.hide();
  }

  onEditMetadata(event: MouseEvent) {
    this.metadataEditor()?.show(event);
    this.editingMetadata.set(true);
  }

  onMetadataUpdated(metadata: Metadata) {
    const updatedEntry = { ...this.entry(), metadata };
    this.entryUpdated.emit(new UpdateEnumEntry(this.entry(), updatedEntry));
    this.editingMetadata.set(false);
    this.metadataEditor()?.hide();
  }
}
