import { Component, input, OnInit, output } from '@angular/core';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { InputText } from 'primeng/inputtext';
import { PropertyTypeaheadEngine } from '../property-typeahead-engine';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Property } from '../../../models/schema';

@Component({
  selector: 'app-add-property',
  standalone: true,
  imports: [AutoComplete, InputText, ReactiveFormsModule],
  templateUrl: './add-property.component.html',
  styleUrl: './add-property.component.scss',
})
export class AddPropertyComponent implements OnInit {
  readonly existingSchemaLookup = input<Record<string, string>>();

  readonly propertyAdded = output<Property>();

  typeaheadSuggestions: string[] = [];
  typeaheadEngine?: PropertyTypeaheadEngine;
  nameFormControl = new FormControl('', [Validators.required]); //todo no duplicates
  typeFormControl = new FormControl('', [Validators.required]);

  ngOnInit(): void {
    this.typeaheadEngine = new PropertyTypeaheadEngine(
      this.existingSchemaLookup(),
    );
  }

  onNameKeydown(event: KeyboardEvent, typeInput: AutoComplete) {
    if (event.key === ':') {
      typeInput.inputEL?.nativeElement.focus();
      event.preventDefault();
    }
  }

  onTypeahead(event: AutoCompleteCompleteEvent) {
    this.typeaheadSuggestions = this.typeaheadEngine!.getSuggestions(
      event.query,
    );
  }

  onTypeEnterKeydown(nameInput: any) {
    if (this.nameFormControl.invalid || this.typeFormControl.invalid) return;

    const parseResult = this.typeaheadEngine!.parse(
      this.typeFormControl.value!,
    );

    if (parseResult.error) {
      this.typeFormControl.errors!['parse'] = parseResult.error;
    } else {
      const property = this.typeaheadEngine!.toProperty(
        parseResult,
        this.nameFormControl.value!,
      );

      if (property) {
        this.propertyAdded.emit(property);

        this.nameFormControl.reset();
        this.typeFormControl.reset();

        //this needs to be delayed or the autocomplete component steals focus back
        setTimeout(() => {
          nameInput.focus();
        }, 1);
      }
    }
  }
}
