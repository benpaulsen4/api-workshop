import { ChangeEnumType, UpdateName } from './edit-actions';
import { AddSchemaProperty } from './edit-actions';
import { RemoveSchemaProperty } from './edit-actions';
import { UpdateSchemaProperty } from './edit-actions';
import { UpdateChildProperty } from './edit-actions';
import { AddEnumEntry } from './edit-actions';
import { RemoveEnumEntry } from './edit-actions';
import { UpdateEnumEntry } from './edit-actions';
import { NamedEntity } from './named-entity';
import {
  Schema,
  Property,
  PropertyType,
  ObjectOptions,
  ArrayOptions,
  EnumOptions,
} from './schema';
import { Enum, EnumEntry } from './enum';

describe('EditActions', () => {
  describe('UpdateName', () => {
    let testEntity: NamedEntity;

    beforeEach(() => {
      testEntity = { id: 'test', name: 'oldName', created: 1, modified: 1 };
    });

    it('should update name when apply is called', () => {
      const action = new UpdateName('oldName', 'newName');
      action.apply(testEntity);
      expect(testEntity.name).toBe('newName');
    });

    it('should revert name when revert is called', () => {
      const action = new UpdateName('oldName', 'newName');
      action.apply(testEntity);
      action.revert(testEntity);
      expect(testEntity.name).toBe('oldName');
    });

    it('should provide correct description', () => {
      const action = new UpdateName('oldName', 'newName');
      expect(action.describe()).toBe("Update name from 'oldName' to 'newName'");
    });
  });

  describe('AddSchemaProperty', () => {
    let testSchema: Schema;
    let testProperty: Property;

    beforeEach(() => {
      testSchema = {
        id: '1',
        name: 'test',
        created: 1,
        modified: 1,
        properties: [],
      };
      testProperty = {
        name: 'newProp',
        type: PropertyType.String,
        nullable: false,
      };
    });

    it('should add property when apply is called', () => {
      const action = new AddSchemaProperty(testProperty);
      action.apply(testSchema);
      expect(testSchema.properties.length).toBe(1);
      expect(testSchema.properties[0]).toBe(testProperty);
    });

    it('should remove property when revert is called', () => {
      const action = new AddSchemaProperty(testProperty);
      action.apply(testSchema);
      action.revert(testSchema);
      expect(testSchema.properties.length).toBe(0);
    });

    it('should provide correct description', () => {
      const action = new AddSchemaProperty(testProperty);
      expect(action.describe()).toBe("Added property 'newProp'");
    });

    it('should throw error when reverting without applying', () => {
      const action = new AddSchemaProperty(testProperty);
      expect(() => action.revert(testSchema)).toThrow(
        Error('Cannot revert add property as the property was not found'),
      );
    });
  });

  describe('RemoveSchemaProperty', () => {
    let testSchema: Schema;
    let testProperty: Property;

    beforeEach(() => {
      testProperty = {
        name: 'existingProp',
        type: PropertyType.String,
        nullable: false,
      };
      testSchema = {
        id: '1',
        name: 'test',
        created: 1,
        modified: 1,
        properties: [testProperty],
      };
    });

    it('should remove property when apply is called', () => {
      const action = new RemoveSchemaProperty(testProperty);
      action.apply(testSchema);
      expect(testSchema.properties.length).toBe(0);
    });

    it('should restore property when revert is called', () => {
      const action = new RemoveSchemaProperty(testProperty);
      action.apply(testSchema);
      action.revert(testSchema);
      expect(testSchema.properties.length).toBe(1);
      expect(testSchema.properties[0]).toBe(testProperty);
    });

    it('should throw error when property not found', () => {
      const nonExistentProperty = {
        name: 'nonExistent',
        type: PropertyType.String,
        nullable: false,
      };
      const action = new RemoveSchemaProperty(nonExistentProperty);
      expect(() => action.apply(testSchema)).toThrow(
        Error('Cannot remove property as it was not found'),
      );
    });

    it('should provide correct description', () => {
      const action = new RemoveSchemaProperty(testProperty);
      expect(action.describe()).toBe("Removed property 'existingProp'");
    });
  });

  describe('UpdateSchemaProperty', () => {
    let testSchema: Schema;
    let beforeProperty: Property;
    let afterProperty: Property;

    beforeEach(() => {
      beforeProperty = {
        name: 'testProp',
        type: PropertyType.String,
        nullable: false,
      };
      afterProperty = {
        name: 'testProp',
        type: PropertyType.Number,
        nullable: true,
      };
      testSchema = {
        id: '1',
        name: 'test',
        created: 1,
        modified: 1,
        properties: [beforeProperty],
      };
    });

    it('should update property when apply is called', () => {
      const action = new UpdateSchemaProperty(beforeProperty, afterProperty);
      action.apply(testSchema);
      expect(testSchema.properties[0]).toBe(afterProperty);
    });

    it('should restore original property when revert is called', () => {
      const action = new UpdateSchemaProperty(beforeProperty, afterProperty);
      action.apply(testSchema);
      action.revert(testSchema);
      expect(testSchema.properties[0]).toBe(beforeProperty);
    });

    it('should throw error when property not found', () => {
      const nonExistentProperty = {
        name: 'nonExistent',
        type: PropertyType.String,
        nullable: false,
      };
      const action = new UpdateSchemaProperty(
        nonExistentProperty,
        afterProperty,
      );
      expect(() => action.apply(testSchema)).toThrow(
        Error('Cannot update property as it was not found'),
      );
    });

    it('should provide correct description', () => {
      const action = new UpdateSchemaProperty(beforeProperty, afterProperty);
      expect(action.describe()).toBe("Updated property 'testProp'");
    });
  });

  describe('UpdateChildProperty', () => {
    let testSchema: Schema;
    let parentProperty: Property;
    let childProperty: Property;
    let updatedChildProperty: Property;

    beforeEach(() => {
      childProperty = {
        name: 'childProp',
        type: PropertyType.String,
        nullable: false,
      };
      updatedChildProperty = {
        name: 'childProp',
        type: PropertyType.Number,
        nullable: true,
      };
      parentProperty = {
        name: 'parentProp',
        type: PropertyType.Object,
        nullable: false,
        options: {
          objectType: 'inline',
          childProperties: [childProperty],
        } as ObjectOptions,
      };
      testSchema = {
        id: '1',
        name: 'test',
        created: 1,
        modified: 1,
        properties: [parentProperty],
      };
    });

    it('should update child property when apply is called', () => {
      const innerAction = new UpdateSchemaProperty(
        childProperty,
        updatedChildProperty,
      );
      const action = new UpdateChildProperty(parentProperty, innerAction);
      action.apply(testSchema);
      expect(
        (testSchema.properties[0].options as ObjectOptions).childProperties![0],
      ).toEqual(updatedChildProperty);
    });

    it('should restore child property when revert is called', () => {
      const innerAction = new UpdateSchemaProperty(
        childProperty,
        updatedChildProperty,
      );
      const action = new UpdateChildProperty(parentProperty, innerAction);
      action.apply(testSchema);
      action.revert(testSchema);
      expect(
        (testSchema.properties[0].options as ObjectOptions).childProperties![0],
      ).toEqual(childProperty);
    });

    it('should throw error when parent is not an inline object', () => {
      const invalidParent: Property = {
        name: 'invalidParent',
        type: PropertyType.Object,
        nullable: false,
        options: { objectType: 'ref' } as ObjectOptions,
      };
      const innerAction = new UpdateSchemaProperty(
        childProperty,
        updatedChildProperty,
      );
      const action = new UpdateChildProperty(invalidParent, innerAction);
      expect(() => action.apply(testSchema)).toThrow(
        Error(
          'Cannot update child property as parent is not inline object/enum or array of type inline object/enum',
        ),
      );
    });

    it('should update child enum property when apply is called', () => {
      const enumProperty = {
        name: 'enumProp',
        type: PropertyType.Enum,
        nullable: false,
        options: {
          enumType: 'string',
          values: [{ name: 'oldValue', value: 'OLD' }],
        } as EnumOptions,
      };
      const testSchema = {
        id: '1',
        name: 'test',
        created: 1,
        modified: 1,
        properties: [parentProperty],
      };

      const innerAction = new UpdateEnumEntry(
        { name: 'oldValue', value: 'OLD' },
        { name: 'oldValue', value: 'NEW' },
      );
      const action = new UpdateChildProperty(enumProperty, innerAction);
      action.apply(testSchema);
      expect(
        (testSchema.properties[0].options as EnumOptions).values[0].value,
      ).toBe('NEW');
    });

    it('should update array of inline objects when apply is called', () => {
      const childProperty = {
        name: 'childProp',
        type: PropertyType.String,
        nullable: false,
      };
      const arrayProperty = {
        name: 'arrayProp',
        type: PropertyType.Array,
        nullable: false,
        options: {
          childType: PropertyType.Object,
          childOptions: {
            objectType: 'inline',
            childProperties: [childProperty],
          } as ObjectOptions,
        } as ArrayOptions,
      };
      const testSchema = {
        id: '1',
        name: 'test',
        created: 1,
        modified: 1,
        properties: [arrayProperty],
      };

      const updatedChildProperty = {
        name: 'childProp',
        type: PropertyType.Number,
        nullable: true,
      };
      const innerAction = new UpdateSchemaProperty(
        childProperty,
        updatedChildProperty,
      );
      const action = new UpdateChildProperty(arrayProperty, innerAction);
      action.apply(testSchema);
      expect(
        (
          (testSchema.properties[0].options as ArrayOptions)
            .childOptions as ObjectOptions
        ).childProperties![0].type,
      ).toBe(PropertyType.Number);
    });

    it('should update array of enum when apply is called', () => {
      const enumValue = { name: 'oldValue', value: 'OLD' };
      const arrayProperty = {
        name: 'arrayProp',
        type: PropertyType.Array,
        nullable: false,
        options: {
          childType: PropertyType.Enum,
          childOptions: {
            enumType: 'string',
            values: [enumValue],
          } as EnumOptions,
        } as ArrayOptions,
      };
      const testSchema = {
        id: '1',
        name: 'test',
        created: 1,
        modified: 1,
        properties: [arrayProperty],
      };

      const innerAction = new UpdateEnumEntry(enumValue, {
        name: 'oldValue',
        value: 'NEW',
      });
      const action = new UpdateChildProperty(arrayProperty, innerAction);
      action.apply(testSchema);
      expect(
        (
          (testSchema.properties[0].options as ArrayOptions)
            .childOptions as EnumOptions
        ).values[0].value,
      ).toBe('NEW');
    });

    it('should restore array of enum values when revert is called', () => {
      const enumValue = { name: 'oldValue', value: 'OLD' };
      const arrayProperty = {
        name: 'arrayProp',
        type: PropertyType.Array,
        nullable: false,
        options: {
          childType: PropertyType.Enum,
          childOptions: {
            enumType: 'string',
            values: [enumValue],
          } as EnumOptions,
        } as ArrayOptions,
      };
      const testSchema = {
        id: '1',
        name: 'test',
        created: 1,
        modified: 1,
        properties: [arrayProperty],
      };

      const innerAction = new UpdateEnumEntry(enumValue, {
        name: 'oldValue',
        value: 'NEW',
      });
      const action = new UpdateChildProperty(arrayProperty, innerAction);
      action.apply(testSchema);
      action.revert(testSchema);
      expect(
        (
          (testSchema.properties[0].options as ArrayOptions)
            .childOptions as EnumOptions
        ).values[0].value,
      ).toBe('OLD');
    });
  });

  describe('AddEnumEntry', () => {
    let testEnum: Enum;
    let testEntry: EnumEntry;

    beforeEach(() => {
      testEnum = {
        id: 'test',
        name: 'testEnum',
        created: 1,
        modified: 1,
        enumType: 'string',
        values: [],
      };
      testEntry = { name: 'newEntry', value: 'NEW' };
    });

    it('should add entry when apply is called', () => {
      const action = new AddEnumEntry(testEntry);
      action.apply(testEnum);
      expect(testEnum.values.length).toBe(1);
      expect(testEnum.values[0]).toBe(testEntry);
    });

    it('should remove entry when revert is called', () => {
      const action = new AddEnumEntry(testEntry);
      action.apply(testEnum);
      action.revert(testEnum);
      expect(testEnum.values.length).toBe(0);
    });

    it('should provide correct description', () => {
      const action = new AddEnumEntry(testEntry);
      expect(action.describe()).toBe("Added enum entry 'newEntry'");
    });
  });

  describe('RemoveEnumEntry', () => {
    let testEnum: Enum;
    let testEntry: EnumEntry;

    beforeEach(() => {
      testEntry = { name: 'existingEntry', value: 'EXISTING' };
      testEnum = {
        id: 'test',
        name: 'testEnum',
        created: 1,
        modified: 1,
        enumType: 'string',
        values: [testEntry],
      };
    });

    it('should remove entry when apply is called', () => {
      const action = new RemoveEnumEntry(testEntry);
      action.apply(testEnum);
      expect(testEnum.values.length).toBe(0);
    });

    it('should restore entry when revert is called', () => {
      const action = new RemoveEnumEntry(testEntry);
      action.apply(testEnum);
      action.revert(testEnum);
      expect(testEnum.values.length).toBe(1);
      expect(testEnum.values[0]).toBe(testEntry);
    });

    it('should throw error when entry not found', () => {
      const nonExistentEntry = { name: 'nonExistent', value: 'NONE' };
      const action = new RemoveEnumEntry(nonExistentEntry);
      expect(() => action.apply(testEnum)).toThrow(
        Error('Cannot remove enum entry as it was not found'),
      );
    });
  });

  describe('UpdateEnumEntry', () => {
    let testEnum: Enum;
    let beforeEntry: EnumEntry;
    let afterEntry: EnumEntry;

    beforeEach(() => {
      beforeEntry = { name: 'testEntry', value: 'OLD' };
      afterEntry = { name: 'testEntry', value: 'NEW' };
      testEnum = {
        id: 'test',
        name: 'testEnum',
        created: 1,
        modified: 1,
        enumType: 'string',
        values: [beforeEntry],
      };
    });

    it('should update entry when apply is called', () => {
      const action = new UpdateEnumEntry(beforeEntry, afterEntry);
      action.apply(testEnum);
      expect(testEnum.values[0]).toBe(afterEntry);
    });

    it('should restore original entry when revert is called', () => {
      const action = new UpdateEnumEntry(beforeEntry, afterEntry);
      action.apply(testEnum);
      action.revert(testEnum);
      expect(testEnum.values[0]).toBe(beforeEntry);
    });

    it('should throw error when entry not found', () => {
      const nonExistentEntry = { name: 'nonExistent', value: 'NONE' };
      const action = new UpdateEnumEntry(nonExistentEntry, afterEntry);
      expect(() => action.apply(testEnum)).toThrow(
        Error('Cannot update enum entry as it was not found'),
      );
    });

    it('should provide correct description', () => {
      const action = new UpdateEnumEntry(beforeEntry, afterEntry);
      expect(action.describe()).toBe("Updated enum entry 'testEntry'");
    });
  });

  describe('ChangeEnumType', () => {
    let testEnum: Enum;

    beforeEach(() => {
      testEnum = {
        id: 'test',
        name: 'testEnum',
        created: 1,
        modified: 1,
        enumType: 'string',
        values: [],
      };
    });

    it('should change enum type when apply is called', () => {
      const action = new ChangeEnumType('string', 'int');
      action.apply(testEnum);
      expect(testEnum.enumType).toBe('int');
    });

    it('should restore original type when revert is called', () => {
      const action = new ChangeEnumType('string', 'int');
      action.apply(testEnum);
      action.revert(testEnum);
      expect(testEnum.enumType).toBe('string');
    });

    it('should throw error when values exist', () => {
      testEnum.values.push({ name: 'test', value: 'TEST' });
      const action = new ChangeEnumType('string', 'int');
      expect(() => action.apply(testEnum)).toThrow(
        Error("Can't change enum type if values exist"),
      );
    });

    it('should provide correct description', () => {
      const action = new ChangeEnumType('string', 'int');
      expect(action.describe()).toBe(
        "Changed enum type from 'string' to 'int'",
      );
    });
  });
});
