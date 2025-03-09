import { Injectable } from '@angular/core';
import {
  ArrayOptions,
  EnumOptions,
  NumberOptions,
  ObjectOptions,
  Property,
  PropertyType,
  Schema,
} from '../models/schema';
import { ContentDownloadService } from './content-download.service';
import { StringUtils } from '../utilities/string-utils';
import { DataCollections, DataService } from './data.service';
import { RxCollection } from 'rxdb';

@Injectable()
export class SchemaToJsonSchemaExportService {
  static readonly MetadataKey = 'x-api-workshop-meta';

  private schemaCollection: RxCollection;

  constructor(
    private downloadService: ContentDownloadService,
    dataService: DataService,
  ) {
    this.schemaCollection = dataService.getCollection(DataCollections.Schemas);
  }

  public async export(schema: Schema): Promise<void> {
    const converted = await this.convertSchema(schema, undefined, true);
    const stringData = JSON.stringify(converted);
    this.downloadService.downloadFromTextData(
      stringData,
      `${schema.name}.jsonschema`,
      'application/schema+json',
    );
  }

  private async convertSchema(
    schema: Schema,
    externalDefs: Record<string, any> | undefined = undefined,
    includeMetaschemaTag = false,
  ): Promise<any> {
    const result = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: schema.name,
      [SchemaToJsonSchemaExportService.MetadataKey]: {
        id: schema.id,
        created: schema.created,
        modified: schema.modified,
      },
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
      $defs: {},
    };

    for (const property of schema.properties) {
      (result.properties as any)[property.name] = await this.convertProperty(
        property,
        result.required,
        externalDefs ?? result.$defs,
        schema.id,
      );
    }

    if (externalDefs) {
      delete (result as any).$defs;
    }

    if (!includeMetaschemaTag) {
      delete (result as any).$schema;
    }

    return result;
  }

  private async convertProperty(
    property: Property,
    requiredArray: string[],
    defs: Record<string, any>,
    currentSchemaId: string,
  ): Promise<any> {
    if (!property.nullable) {
      requiredArray.push(property.name);
    }

    switch (property.type) {
      case PropertyType.String:
        return {
          type: 'string',
        };
      case PropertyType.Boolean:
        return {
          type: 'boolean',
        };
      case PropertyType.Number:
        return {
          type: (property.options as NumberOptions)?.doublePrecision
            ? 'number'
            : 'integer',
        };
      case PropertyType.Array:
        return {
          type: 'array',
          items: await this.convertProperty(
            {
              name: '',
              type: (property.options as ArrayOptions)?.childType,
              nullable: true,
              options: (property.options as ArrayOptions)?.childOptions,
            },
            [],
            defs,
            currentSchemaId,
          ),
        };
      case PropertyType.Object: {
        const objectOptions = property.options as ObjectOptions;
        if (objectOptions?.objectType === 'inline') {
          const result = {
            type: 'object',
            properties: {},
            required: [],
            additionalProperties: false,
          };
          for (const childProperty of objectOptions?.childProperties ?? []) {
            (result.properties as any)[childProperty.name] =
              await this.convertProperty(
                childProperty,
                result.required,
                defs,
                currentSchemaId,
              );
          }
          return result;
        } else {
          if (objectOptions.refId === currentSchemaId) {
            //special handling for recursive schemas
            return {
              $ref: '#',
            };
          }

          const schema: Schema = (
            await this.schemaCollection
              .findOne({ selector: { id: { $eq: objectOptions.refId } } })
              .exec()
          ).toMutableJSON();
          return {
            $ref: await this.addDefReference(schema, defs),
          };
        }
      }
      case PropertyType.Enum: {
        const enumOptions = property.options as EnumOptions;
        if (enumOptions?.enumType === 'string') {
          return {
            type: 'string',
            enum: enumOptions.values.map((x) => x.value),
            [SchemaToJsonSchemaExportService.MetadataKey]: {
              enumMappings: enumOptions.values.reduce(
                (acc, x) => {
                  acc[x.value] = x.name;
                  return acc;
                },
                {} as Record<string | number, string>,
              ),
            },
          };
        } else if (enumOptions?.enumType === 'int') {
          return {
            type: 'integer',
            enum: enumOptions.values.map((x) => x.value),
            [SchemaToJsonSchemaExportService.MetadataKey]: {
              enumMappings: enumOptions.values.reduce(
                (acc, x) => {
                  acc[x.value] = x.name;
                  return acc;
                },
                {} as Record<string | number, string>,
              ),
            },
          };
        } else {
          throw new Error('Enum refs dont exist yet');
        }
      }
      default:
        throw new Error('Unknown property type');
    }
  }

  private async addDefReference(
    schema: Schema,
    defs: Record<string, any>,
  ): Promise<string> {
    const name = StringUtils.toCamelCase(schema.name);
    if (defs[name]) {
      //reference already exists as schema names are unique
      return `#/$defs/${name}`;
    } else {
      defs[name] = await this.convertSchema(schema, defs);
      return `#/$defs/${name}`;
    }
  }
}
