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
import {
  EditAction,
  RemoveSchemaProperty,
  UpdateChildProperty,
  UpdateSchemaProperty,
} from '../../../models/edit-actions';
import { Message } from 'primeng/message';
import { Tooltip } from 'primeng/tooltip';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, Observable } from 'rxjs';
import { RenamePropertyComponent } from '../rename-property/rename-property.component';
import { Popover } from 'primeng/popover';

@Component({
  selector: 'app-property',
  standalone: true,
  imports: [
    Button,
    AddPropertyComponent,
    Message,
    Tooltip,
    RenamePropertyComponent,
    Popover,
  ],
  templateUrl: './property.component.html',
  styleUrl: './property.component.scss',
})
export class PropertyComponent {
  readonly property = input.required<Property>();
  readonly existingSchemaLookup = input<Record<string, string>>();
  readonly existingPropertyNames = input<Observable<string[]>>();

  readonly propertyUpdated = output<EditAction>();

  readonly typeString = computed(() => this.getTypeString(this.property()));

  readonly hasChildProperties = computed(
    () =>
      this.property().type === PropertyType.Object ||
      (this.property().type === PropertyType.Array &&
        (this.property().options as ArrayOptions)?.childType ===
          PropertyType.Object),
  );
  readonly childProperties = computed(() => {
    if (!this.hasChildProperties()) return [];

    return (
      (this.property().options as ObjectOptions)?.childProperties ??
      ((this.property().options as ArrayOptions)?.childOptions as ObjectOptions)
        ?.childProperties ??
      []
    ); //todo return props for refs
  });
  readonly canAddChildProperties = computed(
    () =>
      (this.hasChildProperties() &&
        (this.property().options as ObjectOptions)?.objectType === 'inline') ||
      ((this.property().options as ArrayOptions)?.childOptions as ObjectOptions)
        ?.objectType === 'inline',
  );
  readonly showArrayOfArrayWarning = computed(
    () =>
      this.property().type === PropertyType.Array &&
      (this.property().options as ArrayOptions)?.childType ===
        PropertyType.Array,
  );
  readonly childPropertyNames = toObservable(this.childProperties).pipe(
    map((a) => a.map((p) => p.name)),
  );

  readonly addMode = signal(false);

  onChildPropertyAdded(prop: Property) {
    if (!this.canAddChildProperties()) return;

    const clone = structuredClone(this.property());

    if (this.property().type === PropertyType.Object) {
      (clone.options as ObjectOptions).childProperties!.push(prop);
    } else if (this.property().type === PropertyType.Array) {
      (
        (clone.options as ArrayOptions)!.childOptions as ObjectOptions
      ).childProperties!.push(prop);
    }
    this.propertyUpdated.emit(new UpdateSchemaProperty(this.property(), clone));
  }

  onChildPropertyUpdated(edit: EditAction) {
    this.propertyUpdated.emit(new UpdateChildProperty(this.property(), edit));
  }

  onDeleteProperty() {
    this.propertyUpdated.emit(new RemoveSchemaProperty(this.property()));
  }

  onRenameProperty(newName: string) {
    const clone = structuredClone(this.property());
    clone.name = newName;
    this.propertyUpdated.emit(new UpdateSchemaProperty(this.property(), clone));
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
