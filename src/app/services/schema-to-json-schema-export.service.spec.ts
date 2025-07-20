import { TestBed } from '@angular/core/testing';
import { SchemaToJsonSchemaExportService } from './schema-to-json-schema-export.service';
import { ContentDownloadService } from './content-download.service';
import { DataService } from './data.service';
import { PropertyType, Schema } from '../models/schema';
import { RxCollection } from 'rxdb';

describe('SchemaToJsonSchemaExportService', () => {
  let service: SchemaToJsonSchemaExportService;
  let mockDownloadService: jasmine.SpyObj<ContentDownloadService>;
  let mockDataService: jasmine.SpyObj<DataService>;
  let mockDataCollection: jasmine.SpyObj<RxCollection>;

  beforeEach(() => {
    mockDownloadService = jasmine.createSpyObj('ContentDownloadService', [
      'downloadFromTextData',
    ]);
    mockDataCollection = jasmine.createSpyObj('RxCollection', ['findOne']);
    mockDataService = jasmine.createSpyObj('DataService', ['getCollection']);
    mockDataService.getCollection.and.returnValue(mockDataCollection);
    TestBed.configureTestingModule({
      providers: [
        SchemaToJsonSchemaExportService,
        { provide: ContentDownloadService, useValue: mockDownloadService },
        { provide: DataService, useValue: mockDataService },
      ],
    });

    service = TestBed.inject(SchemaToJsonSchemaExportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should export schema metadata', async () => {
    const schema: Schema = {
      id: 'test-schema-metadata',
      name: 'TestSchemaMetadata',
      nameLower: 'testschemametadata',
      created: 1234567890,
      modified: 1234567890,
      metadata: {
        description: 'This is a test schema with metadata',
        deprecated: true,
      },
      properties: [
        { name: 'prop', type: PropertyType.String, nullable: false },
      ],
      refIndex: [],
    };

    await service.export(schema);

    const downloadedContent = JSON.parse(
      mockDownloadService.downloadFromTextData.calls.first().args[0],
    );
    expect(downloadedContent.description).toBe(
      'This is a test schema with metadata',
    );
    expect(downloadedContent.deprecated).toBe(true);
  });

  it('should export property metadata', async () => {
    const schema: Schema = {
      id: 'test-property-metadata',
      name: 'TestPropertyMetadata',
      nameLower: 'testpropertymetadata',
      created: 1234567890,
      modified: 1234567890,
      properties: [
        {
          name: 'stringProp',
          type: PropertyType.String,
          nullable: false,
          metadata: {
            description: 'A string property with metadata',
            deprecated: true,
          },
        },
        {
          name: 'boolProp',
          type: PropertyType.Boolean,
          nullable: true,
          metadata: {
            description: 'A boolean property with metadata',
            deprecated: false,
          },
        },
        {
          name: 'numberProp',
          type: PropertyType.Number,
          nullable: false,
          options: { doublePrecision: true },
          metadata: {
            description: 'A number property with metadata',
            deprecated: true,
          },
        },
        {
          name: 'arrayProp',
          type: PropertyType.Array,
          nullable: false,
          options: {
            childType: PropertyType.String,
          },
          metadata: {
            description: 'An array property with metadata',
            deprecated: false,
          },
        },
        {
          name: 'objectProp',
          type: PropertyType.Object,
          nullable: false,
          options: {
            objectType: 'inline',
            childProperties: [
              { name: 'childProp', type: PropertyType.String, nullable: false },
            ],
          },
          metadata: {
            description: 'An object property with metadata',
            deprecated: true,
          },
        },
      ],
      refIndex: [],
    };

    await service.export(schema);

    const downloadedContent = JSON.parse(
      mockDownloadService.downloadFromTextData.calls.first().args[0],
    );

    // Check string property metadata
    expect(downloadedContent.properties.stringProp.description).toBe(
      'A string property with metadata',
    );
    expect(downloadedContent.properties.stringProp.deprecated).toBe(true);

    // Check boolean property metadata
    expect(downloadedContent.properties.boolProp.description).toBe(
      'A boolean property with metadata',
    );
    expect(downloadedContent.properties.boolProp.deprecated).toBe(false);

    // Check number property metadata
    expect(downloadedContent.properties.numberProp.description).toBe(
      'A number property with metadata',
    );
    expect(downloadedContent.properties.numberProp.deprecated).toBe(true);

    // Check array property metadata
    expect(downloadedContent.properties.arrayProp.description).toBe(
      'An array property with metadata',
    );
    expect(downloadedContent.properties.arrayProp.deprecated).toBe(false);

    // Check object property metadata
    expect(downloadedContent.properties.objectProp.description).toBe(
      'An object property with metadata',
    );
    expect(downloadedContent.properties.objectProp.deprecated).toBe(true);
  });

  it('should export enum value metadata', async () => {
    const schema: Schema = {
      id: 'test-enum-metadata',
      name: 'TestEnumMetadata',
      nameLower: 'testenummetadata',
      created: 1234567890,
      modified: 1234567890,
      properties: [
        {
          name: 'enumProp',
          type: PropertyType.Enum,
          nullable: false,
          metadata: {
            description: 'An enum property with metadata',
            deprecated: true,
          },
          options: {
            enumType: 'string',
            values: [
              {
                name: 'First',
                value: 'FIRST',
                metadata: {
                  description: 'First enum value',
                  deprecated: false,
                },
              },
              {
                name: 'Second',
                value: 'SECOND',
                metadata: {
                  description: 'Second enum value',
                  deprecated: true,
                },
              },
            ],
          },
        },
      ],
      refIndex: [],
    };

    await service.export(schema);

    const downloadedContent = JSON.parse(
      mockDownloadService.downloadFromTextData.calls.first().args[0],
    );

    // Check enum property metadata
    expect(downloadedContent.properties.enumProp.description).toBe(
      'An enum property with metadata',
    );
    expect(downloadedContent.properties.enumProp.deprecated).toBe(true);

    // Check enum value metadata
    const enumValueMetadata =
      downloadedContent.properties.enumProp[
        SchemaToJsonSchemaExportService.MetadataKey
      ].enumValueMetadata;
    expect(enumValueMetadata).toBeDefined();

    // Check first enum value metadata
    expect(enumValueMetadata.FIRST.description).toBe('First enum value');
    expect(enumValueMetadata.FIRST.deprecated).toBe(false);

    // Check second enum value metadata
    expect(enumValueMetadata.SECOND.description).toBe('Second enum value');
    expect(enumValueMetadata.SECOND.deprecated).toBe(true);
  });

  it('should export referenced enum with metadata', async () => {
    const referencedEnum = {
      id: 'referenced-enum-metadata',
      name: 'ReferencedEnumMetadata',
      created: 1234567890,
      modified: 1234567890,
      metadata: {
        description: 'A referenced enum with metadata',
        deprecated: true,
      },
      enumType: 'string',
      values: [
        {
          name: 'First',
          value: 'FIRST',
          metadata: {
            description: 'First enum value',
            deprecated: false,
          },
        },
        {
          name: 'Second',
          value: 'SECOND',
          metadata: {
            description: 'Second enum value',
            deprecated: true,
          },
        },
      ],
    };

    const schema: Schema = {
      id: 'test-enum-ref-metadata',
      name: 'TestEnumRefMetadata',
      nameLower: 'testenumrefmetadata',
      created: 1234567890,
      modified: 1234567890,
      properties: [
        {
          name: 'enumRefProp',
          type: PropertyType.Enum,
          nullable: false,
          options: {
            enumType: 'ref',
            refId: 'referenced-enum-metadata',
          },
        },
      ],
      refIndex: ['referenced-enum-metadata'],
    };

    const mockEnumExec = jasmine.createSpy().and.returnValue({
      toMutableJSON: () => referencedEnum,
    });

    mockDataCollection.findOne.and.returnValue({ exec: mockEnumExec } as any);

    await service.export(schema);

    const downloadedContent = JSON.parse(
      mockDownloadService.downloadFromTextData.calls.first().args[0],
    );

    // Check referenced enum metadata
    expect(downloadedContent.$defs.referencedEnumMetadata.description).toBe(
      'A referenced enum with metadata',
    );
    expect(downloadedContent.$defs.referencedEnumMetadata.deprecated).toBe(
      true,
    );

    // Check enum value metadata
    const enumValueMetadata =
      downloadedContent.$defs.referencedEnumMetadata[
        SchemaToJsonSchemaExportService.MetadataKey
      ].enumValueMetadata;
    expect(enumValueMetadata).toBeDefined();

    // Check first enum value metadata
    expect(enumValueMetadata.FIRST.description).toBe('First enum value');
    expect(enumValueMetadata.FIRST.deprecated).toBe(false);

    // Check second enum value metadata
    expect(enumValueMetadata.SECOND.description).toBe('Second enum value');
    expect(enumValueMetadata.SECOND.deprecated).toBe(true);
  });

  it('should export basic schema with primitive types', async () => {
    const schema: Schema = {
      id: 'test-schema',
      name: 'TestSchema',
      nameLower: 'testschema',
      created: 1234567890,
      modified: 1234567890,
      properties: [
        { name: 'stringProp', type: PropertyType.String, nullable: false },
        { name: 'boolProp', type: PropertyType.Boolean, nullable: true },
        {
          name: 'numberProp',
          type: PropertyType.Number,
          nullable: false,
          options: { doublePrecision: true },
        },
      ],
      refIndex: [],
    };

    await service.export(schema);

    expect(mockDownloadService.downloadFromTextData).toHaveBeenCalledWith(
      jasmine.any(String),
      'TestSchema.jsonschema',
      'application/schema+json',
    );

    const downloadedContent = JSON.parse(
      mockDownloadService.downloadFromTextData.calls.first().args[0],
    );
    expect(downloadedContent.$schema).toBe(
      'https://json-schema.org/draft/2020-12/schema',
    );
    expect(downloadedContent.title).toBe('TestSchema');
    expect(downloadedContent.type).toBe('object');
    expect(downloadedContent.required).toContain('stringProp');
    expect(downloadedContent.required).toContain('numberProp');
    expect(downloadedContent.required).not.toContain('boolProp');
    expect(downloadedContent.properties.stringProp.type).toBe('string');
    expect(downloadedContent.properties.boolProp.type).toBe('boolean');
    expect(downloadedContent.properties.numberProp.type).toBe('number');
  });

  it('should handle array type properties', async () => {
    const schema: Schema = {
      id: 'test-array',
      name: 'TestArray',
      nameLower: 'testarray',
      created: 1234567890,
      modified: 1234567890,
      properties: [
        {
          name: 'arrayProp',
          type: PropertyType.Array,
          nullable: false,
          options: {
            childType: PropertyType.String,
          },
        },
      ],
      refIndex: [],
    };

    await service.export(schema);

    const downloadedContent = JSON.parse(
      mockDownloadService.downloadFromTextData.calls.first().args[0],
    );
    expect(downloadedContent.properties.arrayProp.type).toBe('array');
    expect(downloadedContent.properties.arrayProp.items.type).toBe('string');
  });

  it('should handle enum type properties', async () => {
    const schema: Schema = {
      id: 'test-enum',
      name: 'TestEnum',
      nameLower: 'testenum',
      created: 1234567890,
      modified: 1234567890,
      properties: [
        {
          name: 'enumProp',
          type: PropertyType.Enum,
          nullable: false,
          options: {
            enumType: 'string',
            values: [
              { name: 'First', value: 'FIRST' },
              { name: 'Second', value: 'SECOND' },
            ],
          },
        },
      ],
      refIndex: [],
    };

    await service.export(schema);

    const downloadedContent = JSON.parse(
      mockDownloadService.downloadFromTextData.calls.first().args[0],
    );
    expect(downloadedContent.properties.enumProp.type).toBe('string');
    expect(downloadedContent.properties.enumProp.enum).toEqual([
      'FIRST',
      'SECOND',
    ]);
    expect(
      downloadedContent.properties.enumProp[
        SchemaToJsonSchemaExportService.MetadataKey
      ].enumMappings,
    ).toEqual({ FIRST: 'First', SECOND: 'Second' });
  });

  it('should handle inline object type properties', async () => {
    const schema: Schema = {
      id: 'test-object',
      name: 'TestObject',
      nameLower: 'testobject',
      created: 1234567890,
      modified: 1234567890,
      properties: [
        {
          name: 'objectProp',
          type: PropertyType.Object,
          nullable: false,
          options: {
            objectType: 'inline',
            childProperties: [
              { name: 'childProp', type: PropertyType.String, nullable: false },
            ],
          },
        },
      ],
      refIndex: [],
    };

    await service.export(schema);

    const downloadedContent = JSON.parse(
      mockDownloadService.downloadFromTextData.calls.first().args[0],
    );
    expect(downloadedContent.properties.objectProp.type).toBe('object');
    expect(
      downloadedContent.properties.objectProp.properties.childProp.type,
    ).toBe('string');
    expect(downloadedContent.properties.objectProp.required).toContain(
      'childProp',
    );
  });

  it('should handle referenced object type properties', async () => {
    const referencedSchema: Schema = {
      id: 'referenced-schema',
      name: 'ReferencedSchema',
      nameLower: 'referencedschema',
      created: 1234567890,
      modified: 1234567890,
      properties: [
        {
          name: 'referencedProp',
          type: PropertyType.String,
          nullable: false,
        },
      ],
      refIndex: [],
    };

    const schema: Schema = {
      id: 'test-ref',
      name: 'TestRef',
      nameLower: 'testref',
      created: 1234567890,
      modified: 1234567890,
      properties: [
        {
          name: 'refProp',
          type: PropertyType.Object,
          nullable: false,
          options: {
            objectType: 'ref',
            refId: 'referenced-schema',
          },
        },
      ],
      refIndex: ['referenced-schema'],
    };

    const mockExec = jasmine.createSpy().and.returnValue({
      toMutableJSON: () => referencedSchema,
    });
    mockDataCollection.findOne.and.returnValue({ exec: mockExec } as any);

    await service.export(schema);

    const downloadedContent = JSON.parse(
      mockDownloadService.downloadFromTextData.calls.first().args[0],
    );
    expect(downloadedContent.properties.refProp.$ref).toBe(
      '#/$defs/referencedSchema',
    );
    expect(downloadedContent.$defs.referencedSchema).toBeDefined();
    expect(
      downloadedContent.$defs.referencedSchema.properties.referencedProp.type,
    ).toBe('string');
  });

  it('should handle recursive schema references', async () => {
    const schema: Schema = {
      id: 'recursive-schema',
      name: 'RecursiveSchema',
      nameLower: 'recursiveschema',
      created: 1234567890,
      modified: 1234567890,
      properties: [
        {
          name: 'recursiveProp',
          type: PropertyType.Object,
          nullable: false,
          options: {
            objectType: 'ref',
            refId: 'recursive-schema',
          },
        },
      ],
      refIndex: ['recursive-schema'],
    };

    await service.export(schema);

    const downloadedContent = JSON.parse(
      mockDownloadService.downloadFromTextData.calls.first().args[0],
    );
    expect(downloadedContent.properties.recursiveProp.$ref).toBe('#');
  });

  it('should handle referenced enum type properties', async () => {
    const referencedEnum = {
      id: 'referenced-enum',
      name: 'ReferencedEnum',
      created: 1234567890,
      modified: 1234567890,
      enumType: 'string',
      values: [
        { name: 'First', value: 'FIRST' },
        { name: 'Second', value: 'SECOND' },
      ],
    };

    const schema: Schema = {
      id: 'test-enum-ref',
      name: 'TestEnumRef',
      nameLower: 'testenumref',
      created: 1234567890,
      modified: 1234567890,
      properties: [
        {
          name: 'enumRefProp',
          type: PropertyType.Enum,
          nullable: false,
          options: {
            enumType: 'ref',
            refId: 'referenced-enum',
          },
        },
      ],
      refIndex: ['referenced-enum'],
    };

    const mockEnumExec = jasmine.createSpy().and.returnValue({
      toMutableJSON: () => referencedEnum,
    });

    mockDataCollection.findOne.and.returnValue({ exec: mockEnumExec } as any);

    await service.export(schema);

    const downloadedContent = JSON.parse(
      mockDownloadService.downloadFromTextData.calls.first().args[0],
    );
    expect(downloadedContent.properties.enumRefProp.$ref).toBe(
      '#/$defs/referencedEnum',
    );
    expect(downloadedContent.$defs.referencedEnum).toBeDefined();
    expect(downloadedContent.$defs.referencedEnum.type).toBe('string');
    expect(downloadedContent.$defs.referencedEnum.enum).toEqual([
      'FIRST',
      'SECOND',
    ]);
    expect(
      downloadedContent.$defs.referencedEnum[
        SchemaToJsonSchemaExportService.MetadataKey
      ].enumMappings,
    ).toEqual({ FIRST: 'First', SECOND: 'Second' });
  });
});
