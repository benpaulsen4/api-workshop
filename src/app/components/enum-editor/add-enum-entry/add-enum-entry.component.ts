import { Component, ElementRef, Injector, computed, inject, input, output, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { EnumEntry } from '../../../models/enum';
import { CustomValidators } from '../../../utilities/custom-validators';
import { toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, Observable } from 'rxjs';

@Component({
  selector: 'app-add-enum-entry',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, Message],
  templateUrl: './add-enum-entry.component.html',
  styleUrl: './add-enum-entry.component.scss'
})
export class AddEnumEntryComponent {
  readonly existingEntryNames = input<Observable<string[]>>();
  readonly existingEntryValues = input<Observable<(string | number)[]>>();
  readonly enumType = input.required<'string' | 'int'>();

  readonly entryAdded = output<EnumEntry>();
  readonly stoppedAddingEntries = output<void>();

  readonly nameFormControl = new FormControl('', {
    validators: [
      Validators.required,
      CustomValidators.noDuplicates(toSignal(this.existingEntryNames() ?? EMPTY, { injector: inject(Injector) })),
    ],
  });

  readonly valueFormControl = new FormControl('', {
    validators: [
      Validators.required,
      CustomValidators.noDuplicates(toSignal(this.existingEntryValues() ?? EMPTY, { injector: inject(Injector) })),
    ],
  });

  readonly nameInput = viewChild.required<ElementRef>('name');
  readonly valueInput = viewChild.required<ElementRef>('value');

  onNameKeydown(event: KeyboardEvent) {
    if (event.key === '=') {
      this.valueInput()?.nativeElement.focus();
      event.preventDefault();
    } else if (event.key === 'Escape') {
      this.stoppedAddingEntries.emit();
    }
  }

  onValueKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.valueFormControl.valid) {
        this.onSubmit();
      }
    } else if (event.key === 'Escape') {
      this.stoppedAddingEntries.emit();
    }
  }

  onBlur() {
    if (!this.nameFormControl.value && !this.valueFormControl.value) {
      this.stoppedAddingEntries.emit();
    }
  }

  onSubmit() {
    if (!this.nameFormControl.valid || !this.valueFormControl.valid) return;

    const value = this.valueFormControl.value!;
    this.entryAdded.emit({
      name: this.nameFormControl.value!,
      value: this.enumType() === 'int' ? parseInt(value) : value
    });

    this.nameFormControl.reset();
    this.valueFormControl.reset();
    this.nameInput()?.nativeElement.focus();
  }

  errorCodesOf(err: ValidationErrors | null) {
    return err ? Object.keys(err) : [];
  }
}