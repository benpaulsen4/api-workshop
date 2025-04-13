import { Component, input, OnInit, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputGroup } from 'primeng/inputgroup';
import {
  EnumOptions,
  ObjectOptions,
  Property,
  PropertyType,
} from '../../../models/schema';
import { PropertyTypeaheadEngine } from '../property-typeahead-engine';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primeng/autocomplete';

@Component({
  selector: 'app-retype-property',
  imports: [ReactiveFormsModule, AutoComplete, Button, InputGroup],
  templateUrl: './retype-property.component.html',
  styleUrl: './retype-property.component.scss',
})
export class RetypePropertyComponent implements OnInit {
  readonly existingProperty = input<Property>();
  readonly existingSchemaLookup = input<Record<string, string>>();
  readonly enumLookup = input<Record<string, string>>();

  readonly retypeComplete = output<Property>();

  readonly showTypeError = signal(false);

  typeFormControl = new FormControl('');
  typeaheadSuggestions: string[] = [];
  typeaheadEngine?: PropertyTypeaheadEngine;

  ngOnInit(): void {
    // BUG the reference lookups here don't work
    this.typeaheadEngine = new PropertyTypeaheadEngine(
      this.existingSchemaLookup(),
      this.enumLookup(),
    );
  }

  onTypeahead(event: AutoCompleteCompleteEvent) {
    this.typeaheadSuggestions = this.typeaheadEngine!.getSuggestions(
      event.query,
    );
  }

  onSubmit(): void {
    this.showTypeError.set(false);
    const parseResult = this.typeaheadEngine!.parse(
      this.typeFormControl.value!,
    );
    if (parseResult.error) {
      this.showTypeError.set(true);
    } else {
      const property = this.typeaheadEngine!.toProperty(
        parseResult,
        this.existingProperty()!.name,
      );

      if (property) {
        if (property.type === this.existingProperty()!.type) {
          //inline object where only nullability changed - keep children
          if (
            property.type === PropertyType.Object &&
            (property.options as ObjectOptions).objectType === 'inline' &&
            !!(this.existingProperty()!.options as ObjectOptions)
              .childProperties
          ) {
            (property.options as ObjectOptions).childProperties = (
              this.existingProperty()!.options as ObjectOptions
            ).childProperties;
          }

          //inline enum where only nullability changed - keep values
          if (
            property.type === PropertyType.Enum &&
            (property.options as EnumOptions).enumType !== 'ref' &&
            (property.options as EnumOptions).enumType ===
              (this.existingProperty()!.options as EnumOptions).enumType &&
            !!(this.existingProperty()!.options as EnumOptions).values
          ) {
            (property.options as EnumOptions).values = (
              this.existingProperty()!.options as EnumOptions
            ).values;
          }
        }

        this.retypeComplete.emit(property);
        this.typeFormControl.reset();
      }
    }
  }
}
