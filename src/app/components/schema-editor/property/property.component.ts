import {
  Component,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
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
import { RetypePropertyComponent } from '../retype-property/retype-property.component';
import { EnumEntryComponent } from '../../enum-editor/enum-entry/enum-entry.component';
import { AddEnumEntryComponent } from '../../enum-editor/add-enum-entry/add-enum-entry.component';
import { EnumEntry } from '../../../models/enum';
import { Router } from '@angular/router';

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
    RetypePropertyComponent,
    EnumEntryComponent,
    AddEnumEntryComponent,
  ],
  templateUrl: './property.component.html',
  styleUrl: './property.component.scss',
})
export class PropertyComponent {
  readonly property = input.required<Property>();
  readonly existingSchemaLookup = input<Record<string, string>>();
  readonly enumLookup = input<Record<string, string>>();
  readonly existingPropertyNames = input<Observable<string[]>>();

  readonly propertyUpdated = output<EditAction>();

  readonly retypePopup = viewChild<Popover>('retype');

  readonly typeString = computed(() => this.getTypeString(this.property()));

  readonly isObjectAdjacent = computed(
    () =>
      this.property().type === PropertyType.Object ||
      (this.property().type === PropertyType.Array &&
        (this.property().options as ArrayOptions)?.childType ===
          PropertyType.Object),
  );
  readonly hasChildProperties = computed(
    () =>
      this.isObjectAdjacent() &&
      ((this.property().options as ObjectOptions)?.objectType === 'inline' ||
        (
          (this.property().options as ArrayOptions)
            ?.childOptions as ObjectOptions
        )?.objectType === 'inline'),
  );
  readonly childProperties = computed(() => {
    if (!this.isObjectAdjacent()) return [];

    return (
      (this.property().options as ObjectOptions)?.childProperties ??
      ((this.property().options as ArrayOptions)?.childOptions as ObjectOptions)
        ?.childProperties ??
      []
    );
  });
  readonly childPropertyNames = toObservable(this.childProperties).pipe(
    map((a) => a.map((p) => p.name)),
  );

  readonly isEnumAdjacent = computed(
    () =>
      this.property().type === PropertyType.Enum ||
      (this.property().type === PropertyType.Array &&
        (this.property().options as ArrayOptions)?.childType ===
          PropertyType.Enum),
  );
  readonly hasEnumValues = computed(
    () =>
      this.isEnumAdjacent() &&
      (this.property().options as EnumOptions)?.enumType !== 'ref' &&
      ((this.property().options as ArrayOptions)?.childOptions as EnumOptions)
        ?.enumType !== 'ref',
  );
  readonly enumValues = computed(() => {
    if (!this.isEnumAdjacent()) return [];

    return (
      (this.property().options as EnumOptions)?.values ??
      ((this.property().options as ArrayOptions)?.childOptions as EnumOptions)
        ?.values ??
      []
    );
  });
  readonly enumValueNames = toObservable(this.enumValues).pipe(
    map((a) => a.map((p) => p.name)),
  );
  readonly enumValueKeys = toObservable(this.enumValues).pipe(
    map((a) => a.map((p) => p.value)),
  );
  readonly enumType = computed(() => {
    const type =
      (this.property().options as EnumOptions)?.enumType ??
      ((this.property().options as ArrayOptions)?.childOptions as EnumOptions)
        ?.enumType;

    if (type === 'ref') {
      //The actual enum type does not matter when a ref type
      return 'string';
    } else {
      return type;
    }
  });

  readonly showArrayOfArrayWarning = computed(
    () =>
      this.property().type === PropertyType.Array &&
      (this.property().options as ArrayOptions)?.childType ===
        PropertyType.Array,
  );
  readonly showUnknownWarning = computed(
    () =>
      this.property().type === PropertyType.Unknown ||
      (this.property().type === PropertyType.Array &&
        (this.property().options as ArrayOptions).childType ===
          PropertyType.Unknown),
  );

  readonly addMode = signal(false);

  constructor(private router: Router) {}

  onChildPropertyAdded(prop: Property) {
    if (!this.hasChildProperties()) return;

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

  onEnumEntryAdded(entry: EnumEntry) {
    if (!this.hasEnumValues()) return;

    const clone = structuredClone(this.property());

    if (this.property().type === PropertyType.Enum) {
      (clone.options as EnumOptions).values!.push(entry);
    } else if (this.property().type === PropertyType.Array) {
      (
        (clone.options as ArrayOptions)!.childOptions as EnumOptions
      ).values!.push(entry);
    }
    this.propertyUpdated.emit(new UpdateSchemaProperty(this.property(), clone));
  }

  onEnumEntryUpdated(edit: EditAction) {
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

  onRetypeProperty(newProperty: Property) {
    this.propertyUpdated.emit(
      new UpdateSchemaProperty(this.property(), newProperty),
    );
    this.retypePopup()?.hide();
  }

  async onGoToReference() {
    if (
      this.property().type === PropertyType.Object ||
      (this.property().type === PropertyType.Array &&
        (this.property().options as ArrayOptions).childType ===
          PropertyType.Object)
    ) {
      const refId =
        (this.property().options as ObjectOptions)?.refId ??
        (
          (this.property().options as ArrayOptions)
            .childOptions as ObjectOptions
        ).refId;
      if (!refId) return;
      await this.router.navigate(['schemas', refId]);
    } else if (
      this.property().type === PropertyType.Enum ||
      (this.property().type === PropertyType.Array &&
        (this.property().options as ArrayOptions).childType ===
          PropertyType.Enum)
    ) {
      const refId =
        (this.property().options as EnumOptions)?.refId ??
        ((this.property().options as ArrayOptions).childOptions as EnumOptions)
          .refId;
      if (!refId) return;
      await this.router.navigate(['enums', refId]);
    } else {
      throw new Error('Unknown reference type');
    }
  }

  getTypeString(prop: Property): string {
    let baseString = 'invalid';
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
      case PropertyType.Enum: {
        const castedOptions = prop.options! as EnumOptions;
        baseString = `enum (${castedOptions.enumType === 'ref' ? Object.entries(this.enumLookup() ?? {}).find((e) => e[1] == castedOptions.refId)?.[0] : castedOptions.enumType})`;
        break;
      }
      case PropertyType.Unknown:
        baseString = 'unknown';
        break;
    }

    if (prop.nullable) {
      baseString += '?';
    }

    return baseString;
  }
}
