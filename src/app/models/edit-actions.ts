import { Enum, EnumEntry } from './enum';
import { NamedEntity } from './named-entity';
import {
  ArrayOptions,
  EnumOptions,
  ObjectOptions,
  Property,
  PropertyType,
  Reference,
  Schema,
} from './schema';

export interface EditAction {
  apply<T extends NamedEntity>(currentState: T): void;
  revert<T extends NamedEntity>(currentState: T): void;
  describe(): string;
}

export class UpdateName implements EditAction {
  constructor(
    private before: string,
    private after: string,
  ) {}

  apply(currentState: NamedEntity): void {
    currentState.name = this.after;
  }

  revert(currentState: NamedEntity): void {
    currentState.name = this.before;
  }

  describe(): string {
    return `Update name from '${this.before}' to '${this.after}'`;
  }
}

//SCHEMA SECTION
export class AddSchemaProperty implements EditAction {
  private index?: number;
  private refIndex?: number;

  constructor(private property: Property) {}

  apply<T>(currentState: T): void {
    this.index = (currentState as Schema).properties.push(this.property) - 1;

    const ref =
      (this.property.options as Reference)?.refId ||
      ((this.property.options as ArrayOptions)?.childOptions as Reference)
        ?.refId;
    if (ref) {
      this.refIndex = (currentState as Schema).refIndex.push(ref) - 1;
    }
  }

  revert<T>(currentState: T): void {
    if (this.index === undefined || this.index === -1) {
      throw new Error(
        'Cannot revert add property as the property was not found',
      );
    }

    (currentState as Schema).properties.splice(this.index, 1);

    if (this.refIndex && this.refIndex !== -1) {
      (currentState as Schema).refIndex.splice(this.refIndex, 1);
    }
  }

  describe(): string {
    return `Added property '${this.property.name}'`;
  }
}

export class RemoveSchemaProperty implements EditAction {
  private index?: number;
  private refIndex?: number;
  private ref?: string;

  constructor(private property: Property) {}

  apply<T>(currentState: T): void {
    this.index = (currentState as Schema).properties.findIndex(
      (p) => p.name === this.property.name,
    );

    if (this.index === undefined || this.index === -1)
      throw new Error('Cannot remove property as it was not found');

    (currentState as Schema).properties.splice(this.index, 1);

    this.ref =
      (this.property.options as Reference)?.refId ||
      ((this.property.options as ArrayOptions)?.childOptions as Reference)
        ?.refId;
    if (this.ref) {
      this.refIndex = (currentState as Schema).refIndex.findIndex(
        (i) => i === this.ref,
      );
      if (this.refIndex != -1) {
        (currentState as Schema).refIndex.splice(this.refIndex, 1);
      }
    }
  }

  revert<T>(currentState: T): void {
    if (this.index === undefined || this.index === -1)
      throw new Error('Cannot revert remove property as it was never found');

    (currentState as Schema).properties.splice(this.index, 0, this.property);

    if (this.refIndex && this.refIndex !== -1 && this.ref) {
      (currentState as Schema).refIndex.splice(this.refIndex, 0, this.ref);
    }
  }

  describe(): string {
    return `Removed property '${this.property.name}'`;
  }
}

export class UpdateSchemaProperty implements EditAction {
  private beforeRef?: string;
  private afterRef?: string;

  constructor(
    private before: Property,
    private after: Property,
  ) {}

  apply<T>(currentState: T): void {
    const index = (currentState as Schema).properties.findIndex(
      (p) => p.name === this.before.name,
    );

    if (index === -1)
      throw new Error('Cannot update property as it was not found');

    (currentState as Schema).properties.splice(index, 1, this.after);

    this.beforeRef =
      (this.before.options as Reference)?.refId ||
      ((this.before.options as ArrayOptions)?.childOptions as Reference)?.refId;

    this.afterRef =
      (this.after.options as Reference)?.refId ||
      ((this.after.options as ArrayOptions)?.childOptions as Reference)?.refId;

    if (this.beforeRef !== this.afterRef) {
      const index = (currentState as Schema).refIndex.findIndex(
        (i) => i === this.beforeRef,
      );

      if (this.beforeRef && index !== -1) {
        (currentState as Schema).refIndex.splice(index, 1);
      }

      if (this.afterRef) {
        (currentState as Schema).refIndex.push(this.afterRef);
      }
    }
  }

  revert<T>(currentState: T): void {
    const index = (currentState as Schema).properties.findIndex(
      (p) => p.name === this.after.name,
    );

    if (index === -1)
      throw new Error(
        'Cannot revert update property as the property was not found',
      );

    (currentState as Schema).properties.splice(index, 1, this.before);

    if (this.beforeRef !== this.afterRef) {
      if (this.afterRef) {
        const index = (currentState as Schema).refIndex.findIndex(
          (i) => i === this.afterRef,
        );
        if (index !== -1) {
          (currentState as Schema).refIndex.splice(index, 1);
        }
      }
      if (this.beforeRef) {
        (currentState as Schema).refIndex.push(this.beforeRef);
      }
    }
  }

  describe(): string {
    return `Updated property '${this.after.name}'`;
  }
}

export class UpdateChildProperty implements EditAction {
  private updatedParent?: Property; //note we could just use full momento of the previous parent to save some back tracking

  constructor(
    private parent: Property,
    private innerUpdate: EditAction,
  ) {}

  apply<T>(currentState: T): void {
    let clone;

    if (
      this.parent.type === PropertyType.Object &&
      (this.parent.options as ObjectOptions)?.objectType === 'inline'
    ) {
      clone = structuredClone(this.parent);
      this.innerUpdate.apply({
        properties: (clone.options as ObjectOptions).childProperties,
        refIndex: (currentState as Schema).refIndex, // BUG this passing down does not seem to work
      } as Schema);
    } else if (
      this.parent.type === PropertyType.Enum &&
      (this.parent.options as EnumOptions)?.enumType !== 'ref'
    ) {
      clone = structuredClone(this.parent);
      this.innerUpdate.apply({
        values: (clone.options as EnumOptions).values,
      } as Enum);
    } else if (
      this.parent.type === PropertyType.Array &&
      ((this.parent.options as ArrayOptions)?.childOptions as ObjectOptions)
        ?.objectType === 'inline'
    ) {
      clone = structuredClone(this.parent);
      this.innerUpdate.apply({
        properties: (
          (clone.options as ArrayOptions).childOptions as ObjectOptions
        ).childProperties,
        refIndex: (currentState as Schema).refIndex,
      } as Schema);
    } else if (
      this.parent.type === PropertyType.Array &&
      ((this.parent.options as ArrayOptions)?.childOptions as EnumOptions)
        ?.enumType !== 'ref'
    ) {
      clone = structuredClone(this.parent);
      this.innerUpdate.apply({
        values: ((clone.options as ArrayOptions).childOptions as EnumOptions)
          .values,
      } as Enum);
    } else {
      throw new Error(
        'Cannot update child property as parent is not inline object/enum or array of type inline object/enum',
      );
    }

    const index = (currentState as Schema).properties.findIndex(
      (p) => p.name === this.parent.name,
    );

    (currentState as Schema).properties.splice(index, 1, clone);
    this.updatedParent = clone;
  }

  revert<T>(currentState: T): void {
    if (!this.updatedParent)
      throw new Error(
        'Cannot revert update of child property as update was never applied',
      );

    let clone;

    if (
      this.updatedParent.type === PropertyType.Object &&
      (this.updatedParent.options as ObjectOptions)?.objectType === 'inline'
    ) {
      clone = structuredClone(this.updatedParent);
      this.innerUpdate.revert({
        properties: (clone.options as ObjectOptions).childProperties,
      } as Schema);
    } else if (
      this.updatedParent.type === PropertyType.Enum &&
      (this.updatedParent.options as EnumOptions)?.enumType !== 'ref'
    ) {
      clone = structuredClone(this.updatedParent);
      this.innerUpdate.revert({
        values: (clone.options as EnumOptions).values,
      } as Enum);
    } else if (
      this.updatedParent.type === PropertyType.Array &&
      (
        (this.updatedParent.options as ArrayOptions)
          ?.childOptions as ObjectOptions
      )?.objectType === 'inline'
    ) {
      clone = structuredClone(this.updatedParent);
      this.innerUpdate.revert({
        properties: (
          (clone.options as ArrayOptions).childOptions as ObjectOptions
        ).childProperties,
      } as Schema);
    } else if (
      this.updatedParent.type === PropertyType.Array &&
      (
        (this.updatedParent.options as ArrayOptions)
          ?.childOptions as EnumOptions
      )?.enumType !== 'ref'
    ) {
      clone = structuredClone(this.updatedParent);
      this.innerUpdate.revert({
        values: ((clone.options as ArrayOptions).childOptions as EnumOptions)
          .values,
      } as Enum);
    } else {
      throw new Error(
        'Cannot revert update child property as parent is not inline object/enum or array of type inline object/enum',
      );
    }

    const index = (currentState as Schema).properties.findIndex(
      (p) => p.name === this.updatedParent!.name,
    );

    (currentState as Schema).properties.splice(index, 1, clone);
  }

  describe(): string {
    return `Updated child of '${this.updatedParent!.name}': ${this.innerUpdate.describe()}`;
  }
}

//ENUM SECTION
export class AddEnumEntry implements EditAction {
  private index?: number;

  constructor(private entry: EnumEntry) {}

  apply<T>(currentState: T): void {
    (currentState as Enum).values.push(this.entry);
    this.index = (currentState as Enum).values.length - 1;
  }

  revert<T>(currentState: T): void {
    if (this.index === undefined || this.index === -1) {
      throw new Error(
        'Cannot revert add enum entry as the entry was not found',
      );
    }

    (currentState as Enum).values.splice(this.index, 1);
  }

  describe(): string {
    return `Added enum entry '${this.entry.name}'`;
  }
}

export class RemoveEnumEntry implements EditAction {
  private index?: number;

  constructor(private entry: EnumEntry) {}

  apply<T>(currentState: T): void {
    this.index = (currentState as Enum).values.findIndex(
      (p) => p.name === this.entry.name,
    );

    if (this.index === undefined || this.index === -1)
      throw new Error('Cannot remove enum entry as it was not found');

    (currentState as Enum).values.splice(this.index, 1);
  }

  revert<T>(currentState: T): void {
    if (this.index === undefined || this.index === -1)
      throw new Error('Cannot revert remove enum entry as it was never found');

    (currentState as Enum).values.splice(this.index, 0, this.entry);
  }

  describe(): string {
    return `Removed enum entry '${this.entry.name}'`;
  }
}

export class UpdateEnumEntry implements EditAction {
  constructor(
    private before: EnumEntry,
    private after: EnumEntry,
  ) {}

  apply<T>(currentState: T): void {
    const index = (currentState as Enum).values.findIndex(
      (p) => p.name === this.before.name,
    );

    if (index === -1)
      throw new Error('Cannot update enum entry as it was not found');

    (currentState as Enum).values.splice(index, 1, this.after);
  }

  revert<T>(currentState: T): void {
    const index = (currentState as Enum).values.findIndex(
      (p) => p.name === this.after.name,
    );

    if (index === -1)
      throw new Error(
        'Cannot revert update enum entry as the entry was not found',
      );

    (currentState as Enum).values.splice(index, 1, this.before);
  }

  describe(): string {
    return `Updated enum entry '${this.after.name}'`;
  }
}

export class ChangeEnumType implements EditAction {
  constructor(
    private before: 'string' | 'int',
    private after: 'string' | 'int',
  ) {}

  apply<T>(currentState: T): void {
    if ((currentState as Enum).values.length)
      throw new Error("Can't change enum type if values exist");
    (currentState as Enum).enumType = this.after;
  }

  revert<T>(currentState: T): void {
    (currentState as Enum).enumType = this.before;
  }

  describe(): string {
    return `Changed enum type from '${this.before}' to '${this.after}'`;
  }
}
