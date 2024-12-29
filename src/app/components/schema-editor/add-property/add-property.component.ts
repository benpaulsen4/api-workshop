import {
  Component,
  ElementRef,
  Injector,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { InputText } from 'primeng/inputtext';
import { PropertyTypeaheadEngine } from '../property-typeahead-engine';
import {
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Property } from '../../../models/schema';
import { CustomValidators } from '../../../utilities/custom-validators';
import { EMPTY, Observable } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { Message } from 'primeng/message';

@Component({
  selector: 'app-add-property',
  standalone: true,
  imports: [AutoComplete, InputText, ReactiveFormsModule, Message],
  templateUrl: './add-property.component.html',
  styleUrl: './add-property.component.scss',
})
export class AddPropertyComponent implements OnInit {
  readonly existingSchemaLookup = input<Record<string, string>>();
  readonly existingPropertyNames = input<Observable<string[]>>();

  readonly propertyAdded = output<Property>();
  readonly stoppedAddingProperties = output<void>();

  readonly nameInput = viewChild.required<ElementRef>('name');
  readonly typeInput = viewChild.required<AutoComplete>('type');

  readonly showTypeError = signal(false);

  typeaheadSuggestions: string[] = [];
  typeaheadEngine?: PropertyTypeaheadEngine;
  nameFormControl!: FormControl<string | null>;
  typeFormControl = new FormControl(''); //no validators as its validated manually on parse

  constructor(private injector: Injector) {}

  ngOnInit(): void {
    this.typeaheadEngine = new PropertyTypeaheadEngine(
      this.existingSchemaLookup(),
    );

    this.nameFormControl = new FormControl('', [
      Validators.required,
      CustomValidators.noDuplicates(
        toSignal(this.existingPropertyNames() ?? EMPTY, {
          injector: this.injector,
        }),
      ),
    ]);

    this.nameInput()?.nativeElement.focus();
  }

  onNameKeydown(event: KeyboardEvent) {
    if (event.key === ':') {
      this.typeInput().inputEL?.nativeElement.focus();
      event.preventDefault();
    }
  }

  onTypeahead(event: AutoCompleteCompleteEvent) {
    this.typeaheadSuggestions = this.typeaheadEngine!.getSuggestions(
      event.query,
    );
  }

  onTypeEnterKeydown() {
    if (this.nameFormControl.invalid) return;

    const parseResult = this.typeaheadEngine!.parse(
      this.typeFormControl.value!,
    );

    if (parseResult.error) {
      this.showTypeError.set(true);
    } else {
      const property = this.typeaheadEngine!.toProperty(
        parseResult,
        this.nameFormControl.value!,
      );

      if (property) {
        this.propertyAdded.emit(property);

        this.nameFormControl.reset();
        this.typeFormControl.reset();
        this.showTypeError.set(false);

        //this needs to be delayed or the autocomplete component steals focus back
        setTimeout(() => {
          this.nameInput().nativeElement.focus();
        }, 1);
      }
    }
  }

  onBlur() {
    if (this.nameFormControl.pristine && this.typeFormControl.pristine) {
      this.stoppedAddingProperties.emit();
    }
  }

  errorCodesOf(err: ValidationErrors | null) {
    return err ? Object.keys(err) : [];
  }
}
