import { NamedEntity } from './named-entity';
import {
  ArrayOptions,
  ObjectOptions,
  Property,
  PropertyType,
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

export class AddSchemaProperty implements EditAction {
  private index?: number;

  constructor(private property: Property) {}

  apply<T>(currentState: T): void {
    (currentState as Schema).properties.push(this.property);
    this.index = (currentState as Schema).properties.length - 1;
  }

  revert<T>(currentState: T): void {
    if (this.index === undefined || this.index === -1) {
      throw new Error(
        'Cannot revert add property as the property was not found',
      );
    }

    (currentState as Schema).properties.splice(this.index, 1);
  }

  describe(): string {
    return `Added property '${this.property.name}'`;
  }
}

export class RemoveSchemaProperty implements EditAction {
  private index?: number;

  constructor(private property: Property) {}

  apply<T>(currentState: T): void {
    this.index = (currentState as Schema).properties.findIndex(
      (p) => p.name === this.property.name,
    );

    if (this.index === undefined || this.index === -1)
      throw new Error('Cannot remove property as it was not found');

    (currentState as Schema).properties.splice(this.index, 1);
  }

  revert<T>(currentState: T): void {
    if (this.index === undefined || this.index === -1)
      throw new Error('Cannot revert remove property as it was never found');

    (currentState as Schema).properties.splice(this.index, 0, this.property);
  }

  describe(): string {
    return `Removed property '${this.property.name}'`;
  }
}

export class UpdateSchemaProperty implements EditAction {
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
      } as Schema);
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
      } as Schema);
    } else {
      throw new Error(
        'Cannot update child property as parent is not inline object or array of type inline object',
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
    } else {
      throw new Error(
        'Cannot revert update child property as parent is not inline object or array of type inline object',
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
