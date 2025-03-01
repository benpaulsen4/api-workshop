import {
  Component,
  inject,
  Injector,
  input,
  OnInit,
  output,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputGroup } from 'primeng/inputgroup';
import { InputText } from 'primeng/inputtext';
import { EMPTY, Observable } from 'rxjs';
import { CustomValidators } from '../../../utilities/custom-validators';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-revalue-entry',
  standalone: true,
  imports: [ReactiveFormsModule, Button, InputGroup, InputText],
  templateUrl: './revalue-entry.component.html',
  styleUrl: './revalue-entry.component.scss',
})
export class RevalueEntryComponent implements OnInit {
  readonly enumType = input.required<'string' | 'int'>();
  readonly existingEntryValues = input<Observable<(string | number)[]>>();
  readonly revalueComplete = output<string | number>();

  valueFormControl!: FormControl<string | null>;

  constructor(private injector: Injector) {}

  ngOnInit(): void {
    this.valueFormControl = new FormControl('', {
      validators: [
        Validators.required,
        CustomValidators.noDuplicates(
          toSignal(this.existingEntryValues() ?? EMPTY, {
            injector: this.injector,
          }),
        ),
      ],
    });
  }

  onSubmit() {
    if (!this.valueFormControl.valid) return;

    const value = this.valueFormControl.value!;
    this.revalueComplete.emit(
      this.enumType() === 'int' ? parseInt(value) : value,
    );
  }
}
