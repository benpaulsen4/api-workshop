import { Injectable } from '@angular/core';
import { RxCollection } from 'rxdb';
import { DataService, DataCollections } from './data.service';
import {
  ArrayOptions,
  ObjectOptions,
  Property,
  PropertyType,
  Reference,
  Schema,
} from '../models/schema';
import { v7 } from 'uuid';
import { Enum, EnumEntry } from '../models/enum';
import { SchemaToJsonSchemaExportService } from './schema-to-json-schema-export.service';

@Injectable()
export class JsonSchemaToSchemaImportService {
  private schemaCollection: RxCollection;
  private enumCollection: RxCollection;

  private schemasToCreate: Record<string, Schema> = {};
  private enumsToCreate: Record<string, Enum> = {};

  constructor(dataService: DataService) {
    this.schemaCollection = dataService.getCollection(DataCollections.Schemas);
    this.enumCollection = dataService.getCollection(DataCollections.Enums);
  }

  // Note: Only unbundedled single-file imports are supported at the moment. This means that all sub-schemas are expected to be aware that they are child definitions of the root schema.
  // As such, all references will be evaluated from the root (#) and references which do not start with this will be ignored.
  public async import(json: string): Promise<ImportResult> {
    this.reset();
    let jsonSchema: any;
    try {
      jsonSchema = JSON.parse(json);
    } catch (e) {
      return new ImportResult(
        new Error(ImportErrorCode.InvalidJson, { cause: e }),
      );
    }

    if (
      !jsonSchema ||
      typeof jsonSchema !== 'object' ||
      Array.isArray(jsonSchema)
    ) {
      return new ImportResult(new Error(ImportErrorCode.InvalidSchema));
    }

    if (
      !jsonSchema.type ||
      jsonSchema.type !== 'object' ||
      !jsonSchema.properties
    ) {
      return new ImportResult(new Error(ImportErrorCode.SchemaNotObject));
    }

    this.importSchema(jsonSchema, '#');

    await Promise.all([
      ...Object.values(this.enumsToCreate).map(enumToCreate =>
        this.enumCollection.insert(enumToCreate),
      ),
      ...Object.values(this.schemasToCreate).map(schemaToCreate =>
        this.schemaCollection.insert(schemaToCreate),
      ),
    ]);

    return new ImportResult({
      schemas: Object.values(this.schemasToCreate).map(s => ({
        name: s.name,
        id: s.id,
      })),
      enums: Object.values(this.enumsToCreate).map(e => ({
        name: e.name,
        id: e.id,
      })),
    });
  }

  private importSchema(
    jsonSchema: any,
    currentPath: string,
    supplementalTitle?: string,
    rootSchema?: any,
  ): Schema {
    const name =
      jsonSchema.title ?? supplementalTitle ?? `ImportedSchema-${Date.now()}`;
    const schema: Schema = {
      id: v7(),
      created: Date.now(),
      modified: Date.now(),
      name,
      nameLower: name.toLowerCase(),
      properties: [],
      refIndex: [],
    };

    for (const [name, property] of Object.entries(jsonSchema.properties)) {
      const prop = this.convertProperty(
        name,
        property,
        rootSchema ?? jsonSchema,
      );
      schema.properties.push(prop);

      this.handleRecursiveReference(prop, schema);
    }

    if (jsonSchema.required) {
      for (const prop of schema.properties) {
        prop.nullable = !jsonSchema.required.includes(prop.name);
      }
    }

    this.schemasToCreate[currentPath] = schema;
    return schema;
  }

  private importEnum(
    jsonEnum: any,
    currentPath: string,
    supplementalTitle?: string,
  ): Enum {
    const name =
      jsonEnum.title ?? supplementalTitle ?? `ImportedEnum-${Date.now()}`;
    const createdEnum: Enum = {
      id: v7(),
      created: Date.now(),
      modified: Date.now(),
      name,
      nameLower: name.toLowerCase(),
      enumType: jsonEnum.type === 'string' ? 'string' : 'int',
      values: this.mapEnumValues(jsonEnum),
    };

    this.enumsToCreate[currentPath] = createdEnum;
    return createdEnum;
  }

  private convertProperty(
    name: string,
    jsonProperty: any,
    rootSchema: any,
  ): Property {
    const propertyResult: Property = {
      name,
      type: PropertyType.Unknown, // Default type, will be updated below
      nullable: true, // Will be updated based on required array
      options: undefined,
    };

    if (jsonProperty.$ref) {
      return this.handleReference(name, jsonProperty.$ref, rootSchema);
    }

    switch (jsonProperty.type) {
      case 'string':
        propertyResult.type = PropertyType.String;
        if (jsonProperty.enum) {
          propertyResult.type = PropertyType.Enum;
          propertyResult.options = {
            enumType: 'string',
            values: this.mapEnumValues(jsonProperty),
          };
        }
        break;

      case 'number':
      case 'integer':
        propertyResult.type = PropertyType.Number;
        propertyResult.options = {
          doublePrecision: jsonProperty.type === 'number',
        };

        if (jsonProperty.enum) {
          propertyResult.type = PropertyType.Enum;
          propertyResult.options = {
            enumType: 'int',
            values: this.mapEnumValues(jsonProperty),
          };
        }
        break;

      case 'boolean':
        propertyResult.type = PropertyType.Boolean;
        break;

      case 'array':
        propertyResult.type = PropertyType.Array;
        if (jsonProperty.items) {
          const fakeChildProp = this.convertProperty(
            'fake',
            jsonProperty.items,
            rootSchema,
          );
          propertyResult.options = {
            childType: fakeChildProp.type,
            childOptions: fakeChildProp.options,
          };
        } else {
          propertyResult.type = PropertyType.Unknown;
          propertyResult.options = {
            originalDefinition: jsonProperty,
          };
        }
        break;

      case 'object':
        propertyResult.type = PropertyType.Object;
        // TODO handle object (any)
        propertyResult.options = {
          objectType: 'inline',
          childProperties: Object.entries(jsonProperty.properties).map(
            ([name, prop]) => this.convertProperty(name, prop, rootSchema),
          ),
        };

        if (jsonProperty.required) {
          for (const prop of propertyResult.options.childProperties!) {
            prop.nullable = !jsonProperty.required.includes(prop.name);
          }
        }
        break;

      default:
        propertyResult.options = {
          originalDefinition: jsonProperty,
        };
        break;
    }

    return propertyResult;
  }

  private handleReference(
    name: string,
    refPath: string,
    rootSchema: any,
  ): Property {
    console.log(name, rootSchema);
    if (refPath === '#') {
      // Reference is recursive
      return {
        name,
        nullable: true,
        type: PropertyType.Object,
        options: {
          objectType: 'ref',
          refId: 'self',
        },
      };
    }

    if (this.schemasToCreate[refPath])
      return {
        name,
        nullable: true,
        type: PropertyType.Object,
        options: {
          objectType: 'ref',
          refId: this.schemasToCreate[refPath].id,
        },
      };

    if (this.enumsToCreate[refPath])
      return {
        name,
        nullable: true,
        type: PropertyType.Enum,
        options: {
          enumType: this.enumsToCreate[refPath].enumType,
          refId: this.enumsToCreate[refPath].id,
        },
      };

    const pathParts = refPath.split('/');
    if (pathParts.length === 0 || pathParts[0] !== '#') {
      return this.createPropertyWithUnknownType(name, {
        originalDefinition: {
          $ref: refPath,
        },
      });
    }
    let currentScope = rootSchema;
    for (let i = 1; i < pathParts.length; i++) {
      const part = pathParts[i];
      if (!currentScope || !currentScope[part]) {
        return this.createPropertyWithUnknownType(name, {
          originalDefinition: {
            $ref: refPath,
          },
        });
      }

      currentScope = currentScope[part];
    }

    if (currentScope.type === 'object') {
      // Import referenced schema
      const schemaResult = this.importSchema(
        currentScope,
        refPath,
        pathParts.pop(),
        rootSchema,
      );

      return {
        name,
        nullable: true,
        type: PropertyType.Object,
        options: {
          objectType: 'ref',
          refId: schemaResult.id,
        },
      };
    } else if (currentScope.enum) {
      // Import referenced enum
      if (
        currentScope.type !== 'string' &&
        currentScope.type !== 'integer' &&
        currentScope.type !== 'number'
      ) {
        return this.createPropertyWithUnknownType(name, {
          originalDefinition: {
            $ref: refPath,
          },
        });
      } else {
        const enumResult = this.importEnum(
          currentScope,
          refPath,
          pathParts.pop(),
        );

        return {
          name,
          nullable: true,
          type: PropertyType.Enum,
          options: {
            enumType: enumResult.enumType,
            refId: enumResult.id,
          },
        };
      }
    } else {
      // Add regular property
      return this.convertProperty(name, currentScope, rootSchema);
    }
  }

  private mapEnumValues(jsonEnum: any): EnumEntry[] {
    const mappings = jsonEnum[SchemaToJsonSchemaExportService.MetadataKey]
      ?.enumMappings as Record<string | number, string>;

    if (mappings) {
      return jsonEnum.enum.map((e: string | number) => ({
        name: mappings[e] ?? e.toString(),
        value: e,
      }));
    } else {
      return jsonEnum.enum.map((e: string | number) => ({
        name: e.toString(),
        value: e,
      }));
    }
  }

  private createPropertyWithUnknownType(
    name: string,
    originalDefinition: any,
  ): Property {
    return {
      name,
      nullable: true,
      type: PropertyType.Unknown,
      options: {
        originalDefinition,
      },
    };
  }

  private handleRecursiveReference(prop: Property, schema: Schema) {
    if (
      prop.type === PropertyType.Object &&
      (prop.options as ObjectOptions)?.childProperties
    ) {
      for (const childProp of (prop.options as ObjectOptions)!
        .childProperties!) {
        this.handleRecursiveReference(childProp, schema);
      }
    } else {
      this.handleRecursiveReferenceInner(prop, schema);
    }
  }

  private handleRecursiveReferenceInner(prop: Property, schema: Schema) {
    const potentialRef = (prop.options as Reference)?.refId
      ? (prop.options as Reference)
      : ((prop.options as ArrayOptions)?.childOptions as Reference);
    if (potentialRef && potentialRef.refId) {
      if (potentialRef.refId === 'self') potentialRef.refId = schema.id;
      schema.refIndex.push(potentialRef.refId);
    }
  }

  private reset() {
    this.schemasToCreate = {};
    this.enumsToCreate = {};
  }
}

export enum ImportErrorCode {
  InvalidJson = 'invalid-json',
  InvalidSchema = 'invalid-schema',
  SchemaNotObject = 'schema-not-object',
}

export class ImportResult {
  readonly status: 'ok' | 'errored';
  readonly error?: Error;
  readonly results?: ImportSummary;

  constructor(input: Error | ImportSummary) {
    if (input instanceof Error) {
      this.status = 'errored';
      this.error = input;
    } else if (input.schemas || input.enums) {
      this.status = 'ok';
      this.results = input;
    } else {
      throw new Error('Invalid input');
    }
  }
}

export interface ImportSummary {
  schemas: NameAndId[];
  enums: NameAndId[];
}

export interface NameAndId {
  name: string;
  id: string;
}
