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
  constructor(private property: Property) {}

  apply<T>(currentState: T): void {
    (currentState as Schema).properties.push(this.property);
  }

  revert<T>(currentState: T): void {
    (currentState as Schema).properties = (
      currentState as Schema
    ).properties.filter((p) => p.name != this.property.name);
  }

  describe(): string {
    return `Added property '${this.property.name}`;
  }
}

export class RemoveSchemaProperty implements EditAction {
  private index?: number;

  constructor(private property: Property) {}

  apply<T>(currentState: T): void {
    this.index = (currentState as Schema).properties.findIndex(
      (p) => p.name == this.property.name,
    );

    (currentState as Schema).properties = (
      currentState as Schema
    ).properties.filter((p) => p.name != this.property.name);
  }

  revert<T>(currentState: T): void {
    if (this.index && this.index != -1) {
      (currentState as Schema).properties.splice(this.index, 0, this.property);
    } else {
      (currentState as Schema).properties.push(this.property);
    }
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
      (p) => p.name == this.before.name,
    );

    if (index === -1)
      throw new Error('Cannot apply action due to inconsistent before state');

    (currentState as Schema).properties.splice(index, 1, this.after);
  }

  revert<T>(currentState: T): void {
    const index = (currentState as Schema).properties.findIndex(
      (p) => p.name == this.after.name,
    );

    if (index === -1)
      throw new Error('Cannot apply action due to inconsistent after state');

    (currentState as Schema).properties.splice(index, 1, this.before);
  }

  describe(): string {
    return `Updated property '${this.after.name}'`;
  }
}

export class UpdateChildProperty implements EditAction {
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
      (p) => p.name == this.parent.name,
    );

    (currentState as Schema).properties.splice(index, 1, clone);
  }

  revert<T>(currentState: T): void {
    if (
      this.parent.type !== PropertyType.Object ||
      (this.parent.options as ObjectOptions).objectType != 'inline'
    )
      throw new Error(
        'Cannot apply action to child as parent is not inline object',
      );

    const index = (currentState as Schema).properties.findIndex(
      (p) => p.name == this.parent.name,
    );

    const clone = structuredClone(this.parent);
    this.innerUpdate.revert({
      properties: (clone.options as ObjectOptions).childProperties,
    } as Schema);

    (currentState as Schema).properties.splice(index, 1, clone);
  }

  describe(): string {
    return `Updated child of '${this.parent.name}': ${this.innerUpdate.describe()}`;
  }
}
