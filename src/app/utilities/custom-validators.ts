import { Signal } from '@angular/core';
import { ValidatorFn } from '@angular/forms';

export class CustomValidators {
  static noDuplicates(currentValues: Signal<any[] | undefined>): ValidatorFn {
    return control => {
      if (currentValues()?.includes(control.value)) {
        return { duplicate: true };
      }
      return null;
    };
  }
}
