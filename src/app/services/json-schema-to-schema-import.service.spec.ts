import { TestBed } from '@angular/core/testing';
import {
  JsonSchemaToSchemaImportService,
  ImportErrorCode,
} from './json-schema-to-schema-import.service';
import { DataService, DataCollections } from './data.service';
import { PropertyType, Schema } from '../models/schema';
import { SchemaToJsonSchemaExportService } from './schema-to-json-schema-export.service';

describe('JsonSchemaToSchemaImportService', () => {
  let service: JsonSchemaToSchemaImportService;
  let dataServiceMock: jasmine.SpyObj<DataService>;
  let schemaCollectionMock: any;
  let enumCollectionMock: any;

  beforeEach(() => {
    schemaCollectionMock = jasmine.createSpyObj('RxCollection', [
      'insert',
      'findOne',
    ]);
    enumCollectionMock = jasmine.createSpyObj('RxCollection', [
      'insert',
      'findOne',
    ]);

    dataServiceMock = jasmine.createSpyObj('DataService', ['getCollection']);
    dataServiceMock.getCollection.and.callFake(
      (collection: DataCollections) => {
        if (collection === DataCollections.Schemas) return schemaCollectionMock;
        if (collection === DataCollections.Enums) return enumCollectionMock;
        return null;
      },
    );

    TestBed.configureTestingModule({
      providers: [
        JsonSchemaToSchemaImportService,
        { provide: DataService, useValue: dataServiceMock },
      ],
    });
    service = TestBed.inject(JsonSchemaToSchemaImportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('import method', () => {
    it('should return error for invalid JSON', async () => {
      const result = await service.import('invalid json');
      expect(result.status).toBe('errored');
      expect(result.error?.message).toBe(ImportErrorCode.InvalidJson);
    });

    it('should return error for non-object JSON', async () => {
      const result = await service.import('"string"');
      expect(result.status).toBe('errored');
      expect(result.error?.message).toBe(ImportErrorCode.InvalidSchema);
    });

    it('should return error for array JSON', async () => {
      const result = await service.import('[]');
      expect(result.status).toBe('errored');
      expect(result.error?.message).toBe(ImportErrorCode.InvalidSchema);
    });

    it('should return error for object without type property', async () => {
      const result = await service.import('{}');
      expect(result.status).toBe('errored');
      expect(result.error?.message).toBe(ImportErrorCode.SchemaNotObject);
    });

    it('should return error for object with wrong type', async () => {
      const result = await service.import('{"type":"string"}');
      expect(result.status).toBe('errored');
      expect(result.error?.message).toBe(ImportErrorCode.SchemaNotObject);
    });

    it('should return error for object without properties', async () => {
      const result = await service.import('{"type":"object"}');
      expect(result.status).toBe('errored');
      expect(result.error?.message).toBe(ImportErrorCode.SchemaNotObject);
    });

    it('should successfully import a simple schema', async () => {
      // Setup mocks
      schemaCollectionMock.insert.and.returnValue(Promise.resolve());
      enumCollectionMock.insert.and.returnValue(Promise.resolve());

      const jsonSchema = {
        title: 'TestSchema',
        type: 'object',
        properties: {
          stringProp: { type: 'string' },
          numberProp: { type: 'number' },
          booleanProp: { type: 'boolean' },
        },
        required: ['stringProp'],
      };

      const result = await service.import(JSON.stringify(jsonSchema));

      expect(result.status).toBe('ok');
      expect(result.results?.schemas.length).toBe(1);
      expect(result.results?.schemas[0].name).toBe('TestSchema');
      expect(schemaCollectionMock.insert).toHaveBeenCalledTimes(1);

      // Verify the schema structure
      const insertedSchema = schemaCollectionMock.insert.calls.first().args[0];
      expect(insertedSchema.properties.length).toBe(3);

      // Check property types
      const stringProp = insertedSchema.properties.find(
        (p: any) => p.name === 'stringProp',
      );
      const numberProp = insertedSchema.properties.find(
        (p: any) => p.name === 'numberProp',
      );
      const booleanProp = insertedSchema.properties.find(
        (p: any) => p.name === 'booleanProp',
      );

      expect(stringProp.type).toBe(PropertyType.String);
      expect(stringProp.nullable).toBe(false); // Required property
      expect(numberProp.type).toBe(PropertyType.Number);
      expect(numberProp.nullable).toBe(true); // Optional property
      expect(booleanProp.type).toBe(PropertyType.Boolean);
      expect(booleanProp.nullable).toBe(true); // Optional property
    });

    it('should import schema with enum properties', async () => {
      // Setup mocks
      schemaCollectionMock.insert.and.returnValue(Promise.resolve());
      enumCollectionMock.insert.and.returnValue(Promise.resolve());

      const jsonSchema = {
        title: 'EnumSchema',
        type: 'object',
        properties: {
          stringEnum: {
            type: 'string',
            enum: ['value1', 'value2', 'value3'],
          },
          intEnum: {
            type: 'integer',
            enum: [1, 2, 3],
          },
        },
      };

      const result = await service.import(JSON.stringify(jsonSchema));

      expect(result.status).toBe('ok');
      expect(result.results?.schemas.length).toBe(1);

      // Verify the schema structure
      const insertedSchema = schemaCollectionMock.insert.calls.first().args[0];
      expect(insertedSchema.properties.length).toBe(2);

      // Check enum properties
      const stringEnum = insertedSchema.properties.find(
        (p: any) => p.name === 'stringEnum',
      );
      const intEnum = insertedSchema.properties.find(
        (p: any) => p.name === 'intEnum',
      );

      expect(stringEnum.type).toBe(PropertyType.Enum);
      expect(stringEnum.options.enumType).toBe('string');
      expect(stringEnum.options.values.length).toBe(3);
      expect(stringEnum.options.values[0].value).toBe('value1');

      expect(intEnum.type).toBe(PropertyType.Enum);
      expect(intEnum.options.enumType).toBe('int');
      expect(intEnum.options.values.length).toBe(3);
      expect(intEnum.options.values[0].value).toBe(1);
    });

    it('should import schema with array properties', async () => {
      // Setup mocks
      schemaCollectionMock.insert.and.returnValue(Promise.resolve());
      enumCollectionMock.insert.and.returnValue(Promise.resolve());

      const jsonSchema = {
        title: 'ArraySchema',
        type: 'object',
        properties: {
          stringArray: {
            type: 'array',
            items: { type: 'string' },
          },
          numberArray: {
            type: 'array',
            items: { type: 'number' },
          },
          objectArray: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                nestedProp: { type: 'string' },
              },
            },
          },
        },
      };

      const result = await service.import(JSON.stringify(jsonSchema));

      expect(result.status).toBe('ok');

      // Verify the schema structure
      const insertedSchema = schemaCollectionMock.insert.calls.first().args[0];

      // Check array properties
      const stringArray = insertedSchema.properties.find(
        (p: any) => p.name === 'stringArray',
      );
      const numberArray = insertedSchema.properties.find(
        (p: any) => p.name === 'numberArray',
      );
      const objectArray = insertedSchema.properties.find(
        (p: any) => p.name === 'objectArray',
      );

      expect(stringArray.type).toBe(PropertyType.Array);
      expect(stringArray.options.childType).toBe(PropertyType.String);

      expect(numberArray.type).toBe(PropertyType.Array);
      expect(numberArray.options.childType).toBe(PropertyType.Number);

      expect(objectArray.type).toBe(PropertyType.Array);
      expect(objectArray.options.childType).toBe(PropertyType.Object);
      expect(objectArray.options.childOptions.objectType).toBe('inline');
      expect(objectArray.options.childOptions.childProperties.length).toBe(1);
      expect(objectArray.options.childOptions.childProperties[0].name).toBe(
        'nestedProp',
      );
    });

    it('should import schema with nested object properties', async () => {
      // Setup mocks
      schemaCollectionMock.insert.and.returnValue(Promise.resolve());
      enumCollectionMock.insert.and.returnValue(Promise.resolve());

      const jsonSchema = {
        title: 'NestedSchema',
        type: 'object',
        properties: {
          nestedObject: {
            type: 'object',
            properties: {
              stringProp: { type: 'string' },
              numberProp: { type: 'number' },
            },
            required: ['stringProp'],
          },
        },
      };

      const result = await service.import(JSON.stringify(jsonSchema));

      expect(result.status).toBe('ok');

      // Verify the schema structure
      const insertedSchema = schemaCollectionMock.insert.calls.first().args[0];
      const nestedObject = insertedSchema.properties.find(
        (p: any) => p.name === 'nestedObject',
      );

      expect(nestedObject.type).toBe(PropertyType.Object);
      expect(nestedObject.options.objectType).toBe('inline');
      expect(nestedObject.options.childProperties.length).toBe(2);

      const stringProp = nestedObject.options.childProperties.find(
        (p: any) => p.name === 'stringProp',
      );
      const numberProp = nestedObject.options.childProperties.find(
        (p: any) => p.name === 'numberProp',
      );

      expect(stringProp.type).toBe(PropertyType.String);
      expect(stringProp.nullable).toBe(false); // Required property
      expect(numberProp.type).toBe(PropertyType.Number);
      expect(numberProp.nullable).toBe(true); // Optional property
    });

    it('should handle schema with self-references', async () => {
      // Setup mocks
      schemaCollectionMock.insert.and.returnValue(Promise.resolve());
      enumCollectionMock.insert.and.returnValue(Promise.resolve());

      const jsonSchema = {
        title: 'RecursiveSchema',
        type: 'object',
        properties: {
          name: { type: 'string' },
          child: { $ref: '#' },
        },
      };

      const result = await service.import(JSON.stringify(jsonSchema));

      expect(result.status).toBe('ok');

      // Verify the schema structure
      const insertedSchema = schemaCollectionMock.insert.calls.first().args[0];
      const childProp = insertedSchema.properties.find(
        (p: any) => p.name === 'child',
      );

      expect(childProp.type).toBe(PropertyType.Object);
      expect(childProp.options.objectType).toBe('ref');
      expect(childProp.options.refId).toBe(insertedSchema.id); // Should reference itself
      expect(insertedSchema.refIndex).toContain(insertedSchema.id); // Should have self-reference in refIndex
    });

    it('should handle schema with enum mappings metadata', async () => {
      // Setup mocks
      schemaCollectionMock.insert.and.returnValue(Promise.resolve());
      enumCollectionMock.insert.and.returnValue(Promise.resolve());

      const jsonSchema = {
        title: 'EnumMappingsSchema',
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'PENDING'],
            [SchemaToJsonSchemaExportService.MetadataKey]: {
              enumMappings: {
                ACTIVE: 'Active',
                INACTIVE: 'Inactive',
                PENDING: 'Pending',
              },
            },
          },
        },
      };

      const result = await service.import(JSON.stringify(jsonSchema));

      expect(result.status).toBe('ok');

      // Verify the schema structure
      const insertedSchema = schemaCollectionMock.insert.calls.first().args[0];
      const statusProp = insertedSchema.properties.find(
        (p: any) => p.name === 'status',
      );

      expect(statusProp.type).toBe(PropertyType.Enum);
      expect(statusProp.options.enumType).toBe('string');
      expect(statusProp.options.values.length).toBe(3);

      // Check that enum mappings were preserved
      const activeEntry = statusProp.options.values.find(
        (v: any) => v.value === 'ACTIVE',
      );
      expect(activeEntry.name).toBe('Active');

      const inactiveEntry = statusProp.options.values.find(
        (v: any) => v.value === 'INACTIVE',
      );
      expect(inactiveEntry.name).toBe('Inactive');

      const pendingEntry = statusProp.options.values.find(
        (v: any) => v.value === 'PENDING',
      );
      expect(pendingEntry.name).toBe('Pending');
    });

    it('should import schema with referenced subschemas from $defs', async () => {
      // Setup mocks
      schemaCollectionMock.insert.and.returnValue(Promise.resolve());
      enumCollectionMock.insert.and.returnValue(Promise.resolve());

      const jsonSchema = {
        title: 'MainSchema',
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: { $ref: '#/$defs/addressDef' },
          contact: { $ref: '#/$defs/contactDef' },
        },
        $defs: {
          addressDef: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              zipCode: { type: 'string' },
            },
            required: ['street', 'city'],
          },
          contactDef: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              phone: { type: 'string' },
            },
            required: ['email'],
          },
        },
      };

      const result = await service.import(JSON.stringify(jsonSchema));

      expect(result.status).toBe('ok');
      expect(result.results?.schemas.length).toBe(3); // Main schema + 2 referenced schemas

      // Verify the main schema structure
      const insertedSchemas = schemaCollectionMock.insert.calls
        .allArgs()
        .map((args: any[]) => args[0]);
      const mainSchema = insertedSchemas.find(
        (s: Schema) => s.name === 'MainSchema',
      );
      const addressSchema = insertedSchemas.find(
        (s: Schema) => s.name === 'addressDef',
      );
      const contactSchema = insertedSchemas.find(
        (s: Schema) => s.name === 'contactDef',
      );

      // Verify main schema properties
      expect(mainSchema).toBeTruthy();
      expect(mainSchema.properties.length).toBe(3);

      // Check reference properties
      const addressProp = mainSchema.properties.find(
        (p: any) => p.name === 'address',
      );
      const contactProp = mainSchema.properties.find(
        (p: any) => p.name === 'contact',
      );

      expect(addressProp.type).toBe(PropertyType.Object);
      expect(addressProp.options.objectType).toBe('ref');
      expect(addressProp.options.refId).toBe(addressSchema.id);

      expect(contactProp.type).toBe(PropertyType.Object);
      expect(contactProp.options.objectType).toBe('ref');
      expect(contactProp.options.refId).toBe(contactSchema.id);

      // Verify address schema
      expect(addressSchema).toBeTruthy();
      expect(addressSchema.properties.length).toBe(3);
      const streetProp = addressSchema.properties.find(
        (p: any) => p.name === 'street',
      );
      const cityProp = addressSchema.properties.find(
        (p: any) => p.name === 'city',
      );
      const zipProp = addressSchema.properties.find(
        (p: any) => p.name === 'zipCode',
      );

      expect(streetProp.type).toBe(PropertyType.String);
      expect(streetProp.nullable).toBe(false); // Required
      expect(cityProp.type).toBe(PropertyType.String);
      expect(cityProp.nullable).toBe(false); // Required
      expect(zipProp.type).toBe(PropertyType.String);
      expect(zipProp.nullable).toBe(true); // Optional

      // Verify contact schema
      expect(contactSchema).toBeTruthy();
      expect(contactSchema.properties.length).toBe(2);
      const emailProp = contactSchema.properties.find(
        (p: any) => p.name === 'email',
      );
      const phoneProp = contactSchema.properties.find(
        (p: any) => p.name === 'phone',
      );

      expect(emailProp.type).toBe(PropertyType.String);
      expect(emailProp.nullable).toBe(false); // Required
      expect(phoneProp.type).toBe(PropertyType.String);
      expect(phoneProp.nullable).toBe(true); // Optional

      // Verify refIndex in main schema contains references to both subschemas
      expect(mainSchema.refIndex).toContain(addressSchema.id);
      expect(mainSchema.refIndex).toContain(contactSchema.id);
    });
  });
});
