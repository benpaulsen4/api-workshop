import { NamedEntity } from './named-entity';
import { Property, Schema } from './schema';

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
    const existing = (currentState as Schema).properties.find(
      (p) => p.name == this.before.name,
    );

    if (!existing)
      throw new Error('Cannot apply action due to inconsistent before state');

    existing.name = this.after.name;
    existing.nullable = this.after.nullable;
    existing.type = this.after.type;
    existing.options = this.after.options;
  }

  revert<T>(currentState: T): void {
    const existing = (currentState as Schema).properties.find(
      (p) => p.name == this.after.name,
    );

    if (!existing)
      throw new Error('Cannot apply action due to inconsistent after state');

    existing.name = this.before.name;
    existing.nullable = this.before.nullable;
    existing.type = this.before.type;
    existing.options = this.before.options;
  }

  describe(): string {
    return `Updated property '${this.after.name}'`;
  }
}
