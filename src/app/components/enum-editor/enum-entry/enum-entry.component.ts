import { Component, computed, input, output } from '@angular/core';
import { Button } from 'primeng/button';
import { Popover } from 'primeng/popover';
import { RenameEntryComponent } from '../rename-entry/rename-entry.component';
import { RevalueEntryComponent } from '../revalue-entry/revalue-entry.component';
import { EnumEntry } from '../../../models/enum';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-enum-entry',
  standalone: true,
  imports: [
    Button,
    Popover,
    RenameEntryComponent,
    RevalueEntryComponent
  ],
  templateUrl: './enum-entry.component.html',
  styleUrl: './enum-entry.component.scss'
})
export class EnumEntryComponent {
  readonly entry = input.required<EnumEntry>();
  readonly enumType = input.required<'string' | 'int'>();
  readonly existingEntryNames = input<Observable<string[]>>();
  readonly existingEntryValues = input<Observable<(string | number)[]>>();

  readonly entryUpdated = output<EnumEntry>();
  readonly entryDeleted = output<void>();

  onDeleteEntry() {
    this.entryDeleted.emit();
  }

  onRenameEntry(newName: string) {
    const updatedEntry = { ...this.entry(), name: newName };
    this.entryUpdated.emit(updatedEntry);
  }

  onUpdateValue(newValue: string | number) {
    const updatedEntry = { ...this.entry(), value: newValue };
    this.entryUpdated.emit(updatedEntry);
  }
}