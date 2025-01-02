import { Component, Injector, input, OnInit, output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomValidators } from '../../../utilities/custom-validators';
import { toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, Observable } from 'rxjs';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { InputGroup } from 'primeng/inputgroup';

@Component({
  selector: 'app-rename-property',
  imports: [ReactiveFormsModule, InputText, Button, InputGroup],
  templateUrl: './rename-property.component.html',
  styleUrl: './rename-property.component.scss',
})
export class RenamePropertyComponent implements OnInit {
  readonly existingPropertyNames = input<Observable<string[]>>();

  readonly renameComplete = output<string>();

  nameFormControl!: FormControl<string | null>;

  constructor(private injector: Injector) {}

  ngOnInit(): void {
    this.nameFormControl = new FormControl('', [
      Validators.required,
      CustomValidators.noDuplicates(
        toSignal(this.existingPropertyNames() ?? EMPTY, {
          injector: this.injector,
        }),
      ),
    ]);
  }

  onSubmit() {
    if (this.nameFormControl.invalid) return;

    this.renameComplete.emit(this.nameFormControl.value!);
  }
}
