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
    const converted = await this.convertSchema(schema, undefined, true, '#');
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
    currentRoot: string,
  ): Promise<any> {
    const result: Record<string, any> = {
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

    // Add description and deprecated status if available
    if (schema.metadata?.description) {
      result['description'] = schema.metadata.description;
    }

    if (schema.metadata?.deprecated !== undefined) {
      result['deprecated'] = !!schema.metadata.deprecated;
    }

    for (const property of schema.properties) {
      (result['properties'] as any)[property.name] = await this.convertProperty(
        property,
        result['required'],
        externalDefs ?? result['$defs'],
        schema.id,
        currentRoot,
      );
    }

    if (externalDefs) {
      delete result['$defs'];
    }

    if (includeMetaschemaTag) {
      result['$schema'] = 'https://json-schema.org/draft/2020-12/schema';
    }

    return result;
  }

  private async convertProperty(
    property: Property,
    requiredArray: string[],
    defs: Record<string, any>,
    currentSchemaId: string,
    currentRoot: string,
  ): Promise<any> {
    if (!property.nullable) {
      requiredArray.push(property.name);
    }

    // Create base result object with metadata if available
    const baseResult: any = {};

    // Add description and deprecated status if available
    if (property.metadata?.description) {
      baseResult.description = property.metadata.description;
    }

    if (property.metadata?.deprecated !== undefined) {
      baseResult.deprecated = !!property.metadata.deprecated;
    }

    switch (property.type) {
      case PropertyType.String:
        return {
          ...baseResult,
          type: 'string',
        };
      case PropertyType.Boolean:
        return {
          ...baseResult,
          type: 'boolean',
        };
      case PropertyType.Number:
        return {
          ...baseResult,
          type: (property.options as NumberOptions)?.doublePrecision
            ? 'number'
            : 'integer',
        };
      case PropertyType.Array:
        return {
          ...baseResult,
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
            currentRoot,
          ),
        };
      case PropertyType.Object: {
        const objectOptions = property.options as ObjectOptions;
        if (objectOptions?.objectType === 'inline') {
          const result = {
            ...baseResult,
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
                currentRoot,
              );
          }
          return result;
        } else {
          if (objectOptions.refId === currentSchemaId) {
            //special handling for recursive schemas
            return {
              ...baseResult,
              $ref: currentRoot,
            };
          }

          const schema: Schema = (
            await this.schemaCollection
              .findOne({ selector: { id: { $eq: objectOptions.refId } } })
              .exec()
          ).toMutableJSON();
          return {
            ...baseResult,
            $ref: await this.addDefReference(schema, defs),
          };
        }
      }
      case PropertyType.Enum: {
        const enumOptions = property.options as EnumOptions;
        if (enumOptions.enumType === 'string') {
          // Create enum mappings with metadata
          const enumMappings: Record<string | number, string> = {};
          const enumValueMetadata: Record<string | number, any> = {};

          for (const enumValue of enumOptions.values!) {
            enumMappings[enumValue.value] = enumValue.name;

            // Add metadata for each enum value if available
            if (enumValue.metadata) {
              enumValueMetadata[enumValue.value] = {};

              if (enumValue.metadata.description) {
                enumValueMetadata[enumValue.value].description =
                  enumValue.metadata.description;
              }

              if (enumValue.metadata.deprecated !== undefined) {
                enumValueMetadata[enumValue.value].deprecated =
                  !!enumValue.metadata.deprecated;
              }
            }
          }

          return {
            ...baseResult,
            type: 'string',
            enum: enumOptions.values!.map(x => x.value),
            [SchemaToJsonSchemaExportService.MetadataKey]: {
              enumMappings,
              enumValueMetadata,
            },
          };
        } else if (enumOptions.enumType === 'int') {
          // Create enum mappings with metadata
          const enumMappings: Record<string | number, string> = {};
          const enumValueMetadata: Record<string | number, any> = {};

          for (const enumValue of enumOptions.values!) {
            enumMappings[enumValue.value] = enumValue.name;

            // Add metadata for each enum value if available
            if (enumValue.metadata) {
              enumValueMetadata[enumValue.value] = {};

              if (enumValue.metadata.description) {
                enumValueMetadata[enumValue.value].description =
                  enumValue.metadata.description;
              }

              if (enumValue.metadata.deprecated !== undefined) {
                enumValueMetadata[enumValue.value].deprecated =
                  !!enumValue.metadata.deprecated;
              }
            }
          }

          return {
            ...baseResult,
            type: 'integer',
            enum: enumOptions.values!.map(x => x.value),
            [SchemaToJsonSchemaExportService.MetadataKey]: {
              enumMappings,
              enumValueMetadata,
            },
          };
        } else {
          const enumEntity: Enum = (
            await this.enumCollection
              .findOne({ selector: { id: { $eq: enumOptions.refId } } })
              .exec()
          ).toMutableJSON();
          return {
            ...baseResult,
            $ref: await this.addDefReference(enumEntity, defs),
          };
        }
      }
      case PropertyType.Unknown:
        return {
          ...baseResult,
          ...(property.options as UnknownOptions).originalDefinition,
        };
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

      defs[name] = await this.convertSchema(
        entity as Schema,
        defs,
        false,
        `#/$defs/${name}`,
      );
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

      // Create enum definition with metadata
      const enumDef: any = {
        type: castedEnum.enumType === 'string' ? 'string' : 'integer',
        enum: castedEnum.values.map(x => x.value),
        [SchemaToJsonSchemaExportService.MetadataKey]: {
          id: castedEnum.id,
          created: castedEnum.created,
          modified: castedEnum.modified,
        },
      };

      // Add description and deprecated status if available
      if (castedEnum.metadata?.description) {
        enumDef.description = castedEnum.metadata.description;
      }

      if (castedEnum.metadata?.deprecated !== undefined) {
        enumDef.deprecated = !!castedEnum.metadata.deprecated;
      }

      // Create enum mappings with metadata
      const enumMappings: Record<string | number, string> = {};
      const enumValueMetadata: Record<string | number, any> = {};

      for (const enumValue of castedEnum.values) {
        enumMappings[enumValue.value] = enumValue.name;

        // Add metadata for each enum value if available
        if (enumValue.metadata) {
          enumValueMetadata[enumValue.value] = {};

          if (enumValue.metadata.description) {
            enumValueMetadata[enumValue.value].description =
              enumValue.metadata.description;
          }

          if (enumValue.metadata.deprecated !== undefined) {
            enumValueMetadata[enumValue.value].deprecated =
              !!enumValue.metadata.deprecated;
          }
        }
      }

      enumDef[SchemaToJsonSchemaExportService.MetadataKey].enumMappings =
        enumMappings;
      enumDef[SchemaToJsonSchemaExportService.MetadataKey].enumValueMetadata =
        enumValueMetadata;

      defs[name] = enumDef;
      return `#/$defs/${name}`;
    } else {
      throw new Error('Unknown entity type');
    }
  }
}
