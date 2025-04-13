import { PropertyTypeaheadEngine } from './property-typeahead-engine';
import { PropertyType } from '../../models/schema';

describe('PropertyTypeaheadEngine', () => {
  let engine: PropertyTypeaheadEngine;

  beforeEach(() => {
    engine = new PropertyTypeaheadEngine(
      {
        User: 'user-schema-id',
        Address: 'address-schema-id',
      },
      {
        Status: 'status-enum-id',
        Priority: 'priority-enum-id',
      },
    );
  });

  describe('parse', () => {
    it('should handle empty input', () => {
      const result = engine.parse('');
      expect(result.error).toBe('Empty input');
      expect(result.nullable).toBeFalse();
      expect(result.baseType).toBeUndefined();
    });

    it('should parse simple types without qualifiers', () => {
      const result = engine.parse('string');
      expect(result.error).toBeUndefined();
      expect(result.baseType).toBe(PropertyType.String);
      expect(result.nullable).toBeFalse();
      expect(result.qualifier).toBeUndefined();
    });

    it('should handle nullable types', () => {
      const result = engine.parse('string?');
      expect(result.error).toBeUndefined();
      expect(result.baseType).toBe(PropertyType.String);
      expect(result.nullable).toBeTrue();
      expect(result.qualifier).toBeUndefined();
    });

    it('should require qualifiers for number type', () => {
      const result = engine.parse('number');
      expect(result.error).toBe('Type number requires a qualifier');
      expect(result.baseType).toBe(PropertyType.Number);
    });

    it('should parse number with valid qualifier', () => {
      const result = engine.parse('number(int)');
      expect(result.error).toBeUndefined();
      expect(result.baseType).toBe(PropertyType.Number);
      expect(result.qualifier).toBe('int');
    });

    it('should reject invalid number qualifier', () => {
      const result = engine.parse('number(float)');
      expect(result.error).toBe(
        'Number type must have qualifier "int" or "double"',
      );
    });

    it('should parse object with inline qualifier', () => {
      const result = engine.parse('object(inline)');
      expect(result.error).toBeUndefined();
      expect(result.baseType).toBe(PropertyType.Object);
      expect(result.qualifier).toBe('inline');
    });

    it('should parse object with schema reference', () => {
      const result = engine.parse('object(User)');
      expect(result.error).toBeUndefined();
      expect(result.baseType).toBe(PropertyType.Object);
      expect(result.qualifier).toBe('User');
    });

    it('should reject invalid object reference', () => {
      const result = engine.parse('object(InvalidSchema)');
      expect(result.error).toBe('Invalid object reference');
    });

    it('should parse array of simple type', () => {
      const result = engine.parse('array(string)');
      expect(result.error).toBeUndefined();
      expect(result.baseType).toBe(PropertyType.Array);
      expect(result.qualifier).toBe('string');
    });

    it('should parse array of qualified type', () => {
      const result = engine.parse('array(number(int))');
      expect(result.error).toBeUndefined();
      expect(result.baseType).toBe(PropertyType.Array);
      expect(result.qualifier).toBe('number(int)');
    });

    it('should handle mismatched parentheses', () => {
      const result = engine.parse('array(string(');
      expect(result.error).toBe('Mismatched parentheses');
    });

    it('should parse enum with valid qualifier', () => {
      const result = engine.parse('enum(string)');
      expect(result.error).toBeUndefined();
      expect(result.baseType).toBe(PropertyType.Enum);
      expect(result.qualifier).toBe('string');
    });

    it('should reject invalid enum qualifier', () => {
      const result = engine.parse('enum(float)');
      expect(result.error).toBe(
        'Enum must have the type "string" or "int" or be a valid reference',
      );
    });

    it('should parse enum with reference qualifier', () => {
      const result = engine.parse('enum(Status)');
      expect(result.error).toBeUndefined();
      expect(result.baseType).toBe(PropertyType.Enum);
      expect(result.qualifier).toBe('Status');
    });

    it('should reject invalid enum reference', () => {
      const result = engine.parse('enum(InvalidEnum)');
      expect(result.error).toBe(
        'Enum must have the type "string" or "int" or be a valid reference',
      );
    });
  });

  describe('getSuggestions', () => {
    it('should return all qualified types for empty input', () => {
      const suggestions = engine.getSuggestions('');
      expect(suggestions).toContain('string');
      expect(suggestions).toContain('boolean');
      expect(suggestions).toContain('number (int)');
      expect(suggestions).toContain('number (double)');
      expect(suggestions).toContain('object (inline)');
      expect(suggestions).toContain('object (User)');
      expect(suggestions).toContain('object (Address)');
      expect(suggestions).toContain('array (string)');
      expect(suggestions).toContain('array (boolean)');
      expect(suggestions).toContain('enum (string)');
      expect(suggestions).toContain('enum (int)');
      expect(suggestions).toContain('enum (Status)');
      expect(suggestions).toContain('enum (Priority)');
    });

    it('should filter suggestions based on partial type name', () => {
      const suggestions = engine.getSuggestions('str');
      expect(suggestions).toEqual(['string']);
    });

    it('should suggest qualifiers for number type', () => {
      const suggestions = engine.getSuggestions('number(');
      expect(suggestions).toEqual(['number(int)', 'number(double)']);
    });

    it('should suggest qualifiers for object type', () => {
      const suggestions = engine.getSuggestions('object(');
      expect(suggestions).toContain('object(inline)');
      expect(suggestions).toContain('object(User)');
      expect(suggestions).toContain('object(Address)');
    });

    it('should suggest qualifiers for array type', () => {
      const suggestions = engine.getSuggestions('array(');
      expect(suggestions).toContain('array(string)');
      expect(suggestions).toContain('array(boolean)');
      // Should not suggest qualified types to prevent infinite suggestions
      expect(suggestions).not.toContain('array(array(string))');
    });

    it('should suggest qualifiers for enum type', () => {
      const suggestions = engine.getSuggestions('enum(');
      expect(suggestions).toContain('enum(string)');
      expect(suggestions).toContain('enum(int)');
      expect(suggestions).toContain('enum(Status)');
      expect(suggestions).toContain('enum(Priority)');
    });

    it('should filter qualifiers based on partial input', () => {
      const suggestions = engine.getSuggestions('number(i');
      expect(suggestions).toEqual(['number(int)']);
    });

    // TODO this test will technically fail if you don't include any spaces, and no suggestions will be returned
    it('should handle nested type suggestions', () => {
      const suggestions = engine.getSuggestions('array (number (');
      expect(suggestions).toEqual([
        'array (number (int))',
        'array (number (double))',
      ]);
    });

    it('should return empty array for invalid type context', () => {
      const suggestions = engine.getSuggestions('invalid(');
      expect(suggestions).toEqual([]);
    });
  });

  describe('toProperty', () => {
    it('should convert simple string type', () => {
      const result = engine.parse('string');
      const property = engine.toProperty(result, 'testProp');
      expect(property).toEqual({
        name: 'testProp',
        type: PropertyType.String,
        nullable: false,
      });
    });

    it('should convert nullable boolean type', () => {
      const result = engine.parse('boolean?');
      const property = engine.toProperty(result, 'testProp');
      expect(property).toEqual({
        name: 'testProp',
        type: PropertyType.Boolean,
        nullable: true,
      });
    });

    it('should convert number type with int qualifier', () => {
      const result = engine.parse('number(int)');
      const property = engine.toProperty(result, 'testProp');
      expect(property).toEqual({
        name: 'testProp',
        type: PropertyType.Number,
        nullable: false,
        options: {
          doublePrecision: false,
        },
      });
    });

    it('should convert number type with double qualifier', () => {
      const result = engine.parse('number(double)');
      const property = engine.toProperty(result, 'testProp');
      expect(property).toEqual({
        name: 'testProp',
        type: PropertyType.Number,
        nullable: false,
        options: {
          doublePrecision: true,
        },
      });
    });

    it('should convert object type with inline qualifier', () => {
      const result = engine.parse('object(inline)');
      const property = engine.toProperty(result, 'testProp');
      expect(property).toEqual({
        name: 'testProp',
        type: PropertyType.Object,
        nullable: false,
        options: {
          objectType: 'inline',
          childProperties: [],
        },
      });
    });

    it('should convert object type with schema reference', () => {
      const result = engine.parse('object(User)');
      const property = engine.toProperty(result, 'testProp');
      expect(property).toEqual({
        name: 'testProp',
        type: PropertyType.Object,
        nullable: false,
        options: {
          objectType: 'ref',
          refId: 'user-schema-id',
        },
      });
    });

    it('should convert array of simple type', () => {
      const result = engine.parse('array(string)');
      const property = engine.toProperty(result, 'testProp');
      expect(property).toEqual({
        name: 'testProp',
        type: PropertyType.Array,
        nullable: false,
        options: {
          childType: PropertyType.String,
          childOptions: undefined,
        },
      });
    });

    it('should convert array of qualified type', () => {
      const result = engine.parse('array(number(int))');
      const property = engine.toProperty(result, 'testProp');
      expect(property).toEqual({
        name: 'testProp',
        type: PropertyType.Array,
        nullable: false,
        options: {
          childType: PropertyType.Number,
          childOptions: {
            doublePrecision: false,
          },
        },
      });
    });

    it('should convert nullable array of qualified type', () => {
      const result = engine.parse('array(number(double))?');
      const property = engine.toProperty(result, 'testProp');
      expect(property).toEqual({
        name: 'testProp',
        type: PropertyType.Array,
        nullable: true,
        options: {
          childType: PropertyType.Number,
          childOptions: {
            doublePrecision: true,
          },
        },
      });
    });

    it('should convert enum type with string qualifier', () => {
      const result = engine.parse('enum(string)');
      const property = engine.toProperty(result, 'testProp');
      expect(property).toEqual({
        name: 'testProp',
        type: PropertyType.Enum,
        nullable: false,
        options: {
          enumType: 'string',
          values: [],
        },
      });
    });

    it('should convert enum type with int qualifier', () => {
      const result = engine.parse('enum(int)');
      const property = engine.toProperty(result, 'testProp');
      expect(property).toEqual({
        name: 'testProp',
        type: PropertyType.Enum,
        nullable: false,
        options: {
          enumType: 'int',
          values: [],
        },
      });
    });

    it('should return null for invalid parse result', () => {
      const result = {
        baseType: undefined,
        nullable: false,
        error: 'Invalid type',
      };
      const property = engine.toProperty(result, 'testProp');
      expect(property).toBeNull();
    });

    it('should convert enum type with reference qualifier', () => {
      const result = engine.parse('enum(Status)');
      const property = engine.toProperty(result, 'testProp');
      expect(property).toEqual({
        name: 'testProp',
        type: PropertyType.Enum,
        nullable: false,
        options: {
          enumType: 'ref',
          refId: 'status-enum-id',
        },
      });
    });

    it('should convert nullable enum type with reference qualifier', () => {
      const result = engine.parse('enum(Priority)?');
      const property = engine.toProperty(result, 'testProp');
      expect(property).toEqual({
        name: 'testProp',
        type: PropertyType.Enum,
        nullable: true,
        options: {
          enumType: 'ref',
          refId: 'priority-enum-id',
        },
      });
    });
  });
});
