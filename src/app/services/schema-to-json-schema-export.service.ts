import { Injectable } from '@angular/core';
import {
  ArrayOptions,
  EnumOptions,
  NumberOptions,
  ObjectOptions,
  Property,
  PropertyType,
  Schema,
  UnknownOptions,
} from '../models/schema';
import { ContentDownloadService } from './content-download.service';
import { StringUtils } from '../utilities/string-utils';
import { DataCollections, DataService } from './data.service';
import { RxCollection } from 'rxdb';
import { NamedEntity } from '../models/named-entity';
import { Enum } from '../models/enum';

@Injectable()
export class SchemaToJsonSchemaExportService {
  static readonly MetadataKey = 'x-api-workshop-meta';

  private schemaCollection: RxCollection;
  private enumCollection: RxCollection;

  constructor(
    private downloadService: ContentDownloadService,
    dataService: DataService,
  ) {
    this.schemaCollection = dataService.getCollection(DataCollections.Schemas);
    this.enumCollection = dataService.getCollection(DataCollections.Enums);
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
              nullable: true, // TODO is this an issue?
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
            // TODO does this work if the recursive schema is itself a def?
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
        if (enumOptions.enumType === 'string') {
          return {
            type: 'string',
            enum: enumOptions.values!.map((x) => x.value),
            [SchemaToJsonSchemaExportService.MetadataKey]: {
              enumMappings: enumOptions.values!.reduce(
                (acc, x) => {
                  acc[x.value] = x.name;
                  return acc;
                },
                {} as Record<string | number, string>,
              ),
            },
          };
        } else if (enumOptions.enumType === 'int') {
          return {
            type: 'integer',
            enum: enumOptions.values!.map((x) => x.value),
            [SchemaToJsonSchemaExportService.MetadataKey]: {
              enumMappings: enumOptions.values!.reduce(
                (acc, x) => {
                  acc[x.value] = x.name;
                  return acc;
                },
                {} as Record<string | number, string>,
              ),
            },
          };
        } else {
          const enumEntity: Enum = (
            await this.enumCollection
              .findOne({ selector: { id: { $eq: enumOptions.refId } } })
              .exec()
          ).toMutableJSON();
          return {
            $ref: await this.addDefReference(enumEntity, defs),
          };
        }
      }
      case PropertyType.Unknown:
        return (property.options as UnknownOptions).originalDefinition;
      default:
        throw new Error('Unknown property type');
    }
  }

  private async addDefReference(
    entity: NamedEntity,
    defs: Record<string, any>,
  ): Promise<string> {
    let name = StringUtils.toCamelCase(entity.name);
    if ((entity as Schema)?.properties) {
      while (defs[name]) {
        if (defs[name].type === 'object') {
          //Reference already exists as schema names are unique
          return `#/$defs/${name}`;
        } else {
          //An enum reference exists with the same name
          name = `${name}Schema`;
        }
      }

      defs[name] = await this.convertSchema(entity as Schema, defs);
      return `#/$defs/${name}`;
    } else if ((entity as Enum)?.values) {
      while (defs[name]) {
        if (defs[name].type === 'string' || defs[name].type === 'integer') {
          //Reference already exists as enum names are unique
          return `#/$defs/${name}`;
        } else {
          //A schema reference exists with the same name
          name = `${name}Enum`;
        }
      }

      const castedEnum = entity as Enum;

      defs[name] = {
        type: castedEnum.enumType === 'string' ? 'string' : 'integer',
        enum: castedEnum.values.map((x) => x.value),
        [SchemaToJsonSchemaExportService.MetadataKey]: {
          id: castedEnum.id,
          created: castedEnum.created,
          modified: castedEnum.modified,
          enumMappings: castedEnum.values.reduce(
            (acc, x) => {
              acc[x.value] = x.name;
              return acc;
            },
            {} as Record<string | number, string>,
          ),
        },
      };
      return `#/$defs/${name}`;
    } else {
      throw new Error('Unknown entity type');
    }
  }
}
