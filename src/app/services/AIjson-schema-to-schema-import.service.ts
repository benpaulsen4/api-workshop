import { Injectable } from '@angular/core';
import {
  Schema,
  Property,
  PropertyType,
  PropertyOptions,
  NumberOptions,
  ObjectOptions,
  ArrayOptions,
  EnumOptions,
} from '../models/schema';
import { DataCollections, DataService } from './data.service';
import { RxCollection } from 'rxdb';
import { StringUtils } from '../utilities/string-utils';
import { Enum, EnumEntry } from '../models/enum';
import { SchemaToJsonSchemaExportService } from './schema-to-json-schema-export.service';

@Injectable()
export class JsonSchemaToSchemaImportService {
  private schemaCollection: RxCollection;
  private enumCollection: RxCollection;

  constructor(private dataService: DataService) {
    this.schemaCollection = dataService.getCollection(DataCollections.Schemas);
    this.enumCollection = dataService.getCollection(DataCollections.Enums);
  }

  public async import(jsonSchema: any): Promise<Schema> {
    if (
      !jsonSchema ||
      typeof jsonSchema !== 'object' ||
      Array.isArray(jsonSchema)
    ) {
      throw new Error('Invalid JSON Schema: must be an object');
    }

    if (jsonSchema.type !== 'object') {
      throw new Error('Only object schemas are supported for import');
    }

    const timestamp = Date.now();
    const schema: Schema = {
      id: crypto.randomUUID(),
      name: this.generateSchemaName(jsonSchema),
      created: timestamp,
      modified: timestamp,
      properties: [],
      refIndex: [],
    };

    // Process definitions first to create referenced schemas
    const definitions = jsonSchema.$defs || jsonSchema.definitions || {};
    for (const [defName, defSchema] of Object.entries(definitions)) {
      await this.processDefinition(defName, defSchema as any, schema);
    }

    // Process main schema properties
    const properties = jsonSchema.properties || {};
    for (const [propName, propSchema] of Object.entries(properties)) {
      const property = await this.convertJsonSchemaProperty(
        propName,
        propSchema as any,
        schema,
      );
      schema.properties.push(property);
    }

    // Handle required properties
    const required = new Set(jsonSchema.required || []);
    for (const prop of schema.properties) {
      prop.nullable = !required.has(prop.name);
    }

    return schema;
  }

  private generateSchemaName(jsonSchema: any): string {
    return jsonSchema.title
      ? StringUtils.toCamelCase(jsonSchema.title)
      : `ImportedSchema_${Date.now()}`;
  }

  private async processDefinition(
    defName: string,
    defSchema: any,
    parentSchema: Schema,
  ): Promise<void> {
    if (defSchema.type === 'object') {
      const schema = await this.import(defSchema);
      schema.name = StringUtils.toCamelCase(defName);
      await this.schemaCollection.insert(schema);
      parentSchema.refIndex.push(schema.id);
    } else if (defSchema.type === 'string' || defSchema.type === 'integer') {
      const enumEntity: Enum = {
        id: crypto.randomUUID(),
        name: StringUtils.toCamelCase(defName),
        created: Date.now(),
        modified: Date.now(),
        enumType: defSchema.type === 'string' ? 'string' : 'int',
        values: this.convertJsonSchemaEnum(defSchema),
      };
      await this.enumCollection.insert(enumEntity);
      parentSchema.refIndex.push(enumEntity.id);
    }
  }

  private async convertJsonSchemaProperty(
    name: string,
    propSchema: any,
    parentSchema: Schema,
  ): Promise<Property> {
    const property: Property = {
      name,
      type: PropertyType.String, // Default type, will be updated below
      nullable: true, // Will be updated based on required array
      options: undefined,
    };

    if (propSchema.$ref) {
      return this.handleReference(property, propSchema.$ref, parentSchema);
    }

    switch (propSchema.type) {
      case 'string':
        property.type = PropertyType.String;
        if (propSchema.enum) {
          property.type = PropertyType.Enum;
          property.options = this.createEnumOptions(propSchema);
        }
        break;

      case 'number':
      case 'integer':
        property.type = PropertyType.Number;
        property.options = {
          doublePrecision: propSchema.type === 'number',
        } as NumberOptions;
        break;

      case 'boolean':
        property.type = PropertyType.Boolean;
        break;

      case 'array':
        property.type = PropertyType.Array;
        property.options = await this.createArrayOptions(
          propSchema,
          parentSchema,
        );
        break;

      case 'object':
        property.type = PropertyType.Object;
        property.options = await this.createObjectOptions(
          propSchema,
          parentSchema,
        );
        break;

      default:
        // Store unsupported types as a special object type with original schema preserved
        property.type = PropertyType.Object;
        property.options = {
          objectType: 'inline',
          childProperties: [],
          [SchemaToJsonSchemaExportService.MetadataKey]: {
            originalSchema: propSchema,
          },
        } as ObjectOptions;
    }

    return property;
  }

  private async handleReference(
    property: Property,
    ref: string,
    parentSchema: Schema,
  ): Promise<Property> {
    const refPath = ref.split('/');
    const refName = refPath[refPath.length - 1];

    // Look up the reference in existing schemas and enums
    const referencedSchema = await this.schemaCollection
      .findOne()
      .where('name')
      .eq(refName)
      .exec();

    const referencedEnum = await this.enumCollection
      .findOne()
      .where('name')
      .eq(refName)
      .exec();

    if (referencedSchema) {
      property.type = PropertyType.Object;
      property.options = {
        objectType: 'ref',
        refId: referencedSchema.id,
      } as ObjectOptions;
    } else if (referencedEnum) {
      property.type = PropertyType.Enum;
      property.options = {
        enumType: 'ref',
        refId: referencedEnum.id,
      } as EnumOptions;
    } else {
      throw new Error(`Referenced schema or enum not found: ${refName}`);
    }

    return property;
  }

  private createEnumOptions(propSchema: any): EnumOptions {
    const values: EnumEntry[] = [];
    const enumMappings =
      propSchema[SchemaToJsonSchemaExportService.MetadataKey]?.enumMappings ||
      {};

    for (const value of propSchema.enum) {
      values.push({
        name: enumMappings[value] || `Value_${value}`,
        value: value,
      });
    }

    return {
      enumType: typeof propSchema.enum[0] === 'string' ? 'string' : 'int',
      values,
    };
  }

  private async createArrayOptions(
    propSchema: any,
    parentSchema: Schema,
  ): Promise<ArrayOptions> {
    const itemSchema = propSchema.items;
    if (!itemSchema) {
      throw new Error('Array type must specify items schema');
    }

    const childProperty = await this.convertJsonSchemaProperty(
      '',
      itemSchema,
      parentSchema,
    );
    return {
      childType: childProperty.type,
      childOptions: childProperty.options,
    };
  }

  private async createObjectOptions(
    propSchema: any,
    parentSchema: Schema,
  ): Promise<ObjectOptions> {
    if (!propSchema.properties) {
      return {
        objectType: 'inline',
        childProperties: [],
        [SchemaToJsonSchemaExportService.MetadataKey]: {
          originalSchema: propSchema,
        },
      };
    }

    const childProperties: Property[] = [];
    const required = new Set(propSchema.required || []);

    for (const [propName, childPropSchema] of Object.entries(
      propSchema.properties,
    )) {
      const childProperty = await this.convertJsonSchemaProperty(
        propName,
        childPropSchema as any,
        parentSchema,
      );
      childProperty.nullable = !required.has(propName);
      childProperties.push(childProperty);
    }

    return {
      objectType: 'inline',
      childProperties,
    };
  }

  private convertJsonSchemaEnum(enumSchema: any): EnumEntry[] {
    const values: EnumEntry[] = [];
    const enumMappings =
      enumSchema[SchemaToJsonSchemaExportService.MetadataKey]?.enumMappings ||
      {};

    for (const value of enumSchema.enum) {
      values.push({
        name: enumMappings[value] || `Value_${value}`,
        value: value,
      });
    }

    return values;
  }
}
