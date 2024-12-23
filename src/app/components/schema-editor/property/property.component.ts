import { Component, computed, input, output, signal } from '@angular/core';
import { Button } from 'primeng/button';
import {
  ArrayOptions,
  EnumOptions,
  NumberOptions,
  ObjectOptions,
  Property,
  PropertyType,
} from '../../../models/schema';
import { AddPropertyComponent } from '../add-property/add-property.component';
import { UpdateSchemaProperty } from '../../../models/edit-actions';

@Component({
  selector: 'app-property',
  standalone: true,
  imports: [Button, AddPropertyComponent],
  templateUrl: './property.component.html',
  styleUrl: './property.component.scss',
})
export class PropertyComponent {
  readonly property = input.required<Property>();
  readonly existingSchemaLookup = input<Record<string, string>>();

  readonly propertyUpdated = output<UpdateSchemaProperty>();

  readonly typeString = computed(() => this.getTypeString(this.property()));
  //todo inline child property editing when in an array
  readonly hasChildProperties = computed(
    () => this.property().type === PropertyType.Object,
  );
  readonly childProperties = computed(() => {
    if (!this.hasChildProperties()) return [];

    return (this.property().options as ObjectOptions).childProperties ?? []; //todo return props for refs
  });
  readonly canAddChildProperties = computed(
    () =>
      this.hasChildProperties() &&
      (this.property().options as ObjectOptions)?.objectType === 'inline',
  );

  readonly addMode = signal(false);

  onChildPropertyAdded(prop: Property) {
    if (!this.canAddChildProperties()) return;

    //todo this is sketchy as we are manually mutating signal state to get change detection working - this means the child doesn't _actually_ reflect the DB state
    const before = structuredClone(this.property());
    (this.property().options as ObjectOptions).childProperties?.push(prop);

    this.propertyUpdated.emit(
      new UpdateSchemaProperty(before, this.property()),
    );
  }

  getTypeString(prop: Property): string {
    let baseString = 'unknown';
    switch (prop.type) {
      case PropertyType.String:
        baseString = 'string';
        break;
      case PropertyType.Number:
        baseString = `number (${(prop.options! as NumberOptions).doublePrecision ? 'double' : 'int'})`;
        break;
      case PropertyType.Boolean:
        baseString = 'boolean';
        break;
      case PropertyType.Object: {
        const castedOptions = prop.options! as ObjectOptions;
        baseString = `object (${castedOptions.objectType == 'inline' ? 'inline' : Object.entries(this.existingSchemaLookup() ?? {}).find((e) => e[1] == castedOptions.refId)?.[0]})`;
        break;
      }
      case PropertyType.Array: {
        const castedOptions = prop.options! as ArrayOptions;
        baseString = `array (${this.getTypeString({ type: castedOptions.childType, options: castedOptions.childOptions } as Property)})`;
        break;
      }
      case PropertyType.Enum:
        baseString = `enum (${(prop.options! as EnumOptions).enumType})`;
        break;
    }

    if (prop.nullable) {
      baseString += '?';
    }

    return baseString;
  }
}
