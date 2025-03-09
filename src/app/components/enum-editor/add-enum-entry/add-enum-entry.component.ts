import {
  Component,
  ElementRef,
  Injector,
  input,
  OnInit,
  output,
  viewChild,
} from '@angular/core';
import {
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { EnumEntry } from '../../../models/enum';
import { EMPTY, firstValueFrom, Observable } from 'rxjs';
import { CustomValidators } from '../../../utilities/custom-validators';
import { toSignal } from '@angular/core/rxjs-interop';
import { StringUtils } from '../../../utilities/string-utils';
import { Button } from 'primeng/button';

@Component({
  selector: 'app-add-enum-entry',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, Message, Button],
  templateUrl: './add-enum-entry.component.html',
  styleUrl: './add-enum-entry.component.scss',
})
export class AddEnumEntryComponent implements OnInit {
  readonly existingEntryNames = input<Observable<string[]>>();
  readonly existingEntryValues = input<Observable<(string | number)[]>>();
  readonly enumType = input.required<'string' | 'int'>();

  readonly entryAdded = output<EnumEntry>();
  readonly stoppedAddingEntries = output<void>();

  readonly nameInput = viewChild<ElementRef>('name');
  readonly valueInput = viewChild<ElementRef>('value');

  nameFormControl!: FormControl<string | null>;
  valueFormControl!: FormControl<string | null>;
  addingEntry = false;

  constructor(private injector: Injector) {}

  ngOnInit(): void {
    this.nameFormControl = new FormControl('', {
      validators: [
        Validators.required,
        CustomValidators.noDuplicates(
          toSignal(this.existingEntryNames() ?? EMPTY, {
            injector: this.injector,
          }),
        ),
      ],
    });

    this.valueFormControl = new FormControl('', {
      validators: [
        CustomValidators.noDuplicates(
          toSignal(this.existingEntryValues() ?? EMPTY, {
            injector: this.injector,
          }),
        ),
      ],
    });

    this.nameInput()?.nativeElement.focus();
  }

  async onNameKeydown(event: KeyboardEvent) {
    if (event.key === '=') {
      this.valueInput()?.nativeElement.focus();
      event.preventDefault();
    } else if (event.key === 'Enter') {
      event.preventDefault();

      //assume value if not set
      if (!this.valueFormControl.value) {
        if (this.enumType() === 'string') {
          this.valueFormControl.setValue(
            StringUtils.toCamelCase(this.nameFormControl.value!),
          );
        } else {
          const index = this.existingEntryValues()
            ? (await firstValueFrom(this.existingEntryValues()!)).length
            : Math.random() * 1000;
          this.valueFormControl.setValue(index.toString());
        }
      }

      this.onSubmit();
    } else if (event.key === 'Escape') {
      this.stoppedAddingEntries.emit();
    }
  }

  onValueKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.onSubmit();
    } else if (event.key === 'Escape') {
      this.stoppedAddingEntries.emit();
    }
  }

  async onAddClick() {
    await this.onNameKeydown({
      key: 'Enter',
      preventDefault: () => {},
    } as KeyboardEvent);
  }

  onBlur() {
    if (this.addingEntry) return;
    if (!this.nameFormControl.value && !this.valueFormControl.value) {
      this.stoppedAddingEntries.emit();
    }
  }

  onSubmit() {
    if (!this.nameFormControl.valid || !this.valueFormControl.valid) return;
    this.addingEntry = true;

    const value = this.valueFormControl.value!;
    this.entryAdded.emit({
      name: this.nameFormControl.value!,
      value: this.enumType() === 'int' ? parseInt(value) : value,
    });

    this.nameFormControl.reset();
    this.valueFormControl.reset();
    this.nameInput()?.nativeElement.focus();
    this.addingEntry = false;
  }

  errorCodesOf(err: ValidationErrors | null) {
    return err ? Object.keys(err) : [];
  }
}
