import { Component, Injector, input, OnInit, output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputGroup } from 'primeng/inputgroup';
import { InputText } from 'primeng/inputtext';
import { EMPTY, Observable } from 'rxjs';
import { CustomValidators } from '../../../utilities/custom-validators';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-rename-entry',
  standalone: true,
  imports: [ReactiveFormsModule, Button, InputGroup, InputText],
  templateUrl: './rename-entry.component.html',
  styleUrl: './rename-entry.component.scss',
})
export class RenameEntryComponent implements OnInit {
  readonly existingEntryNames = input<Observable<string[]>>();
  readonly renameComplete = output<string>();

  nameFormControl!: FormControl<string | null>;

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
  }

  onSubmit() {
    if (!this.nameFormControl.valid) return;
    this.renameComplete.emit(this.nameFormControl.value!);
  }
}
