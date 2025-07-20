import { EnumEntry } from './enum';
import { Metadata, NamedEntity } from './named-entity';

export interface Schema extends NamedEntity {
  id: string;
  name: string;
  created: number;
  modified: number;
  metadata?: Metadata;

  properties: Property[];
  refIndex: string[];
}

export interface Property {
  name: string;
  type: PropertyType;
  nullable: boolean;
  options?: PropertyOptions;
  metadata?: Metadata;
}

export type PropertyOptions =
  | NumberOptions
  | ObjectOptions
  | ArrayOptions
  | EnumOptions
  | UnknownOptions;

export enum PropertyType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
  Enum = 'enum',
  Unknown = 'unknown', // For use only when an imported property uses unsupported features
}

export interface NumberOptions {
  doublePrecision: boolean;
}

export interface ObjectOptions extends Reference {
  objectType: 'inline' | 'ref';
  childProperties?: Property[];
  refId?: string;
}

export interface ArrayOptions {
  childType: PropertyType;
  childOptions?: PropertyOptions;
}

export interface EnumOptions extends Reference {
  enumType: 'string' | 'int' | 'ref';
  values?: EnumEntry[];
  refId?: string;
}

export interface Reference {
  refId?: string;
}

export interface UnknownOptions {
  originalDefinition: object;
}

export const SchemaSchema = {
  version: 5,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 32, //guid length
    },
    name: {
      type: 'string',
    },
    nameLower: {
      type: 'string',
    },
    created: {
      type: 'number',
    },
    modified: {
      type: 'number',
    },
    metadata: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        deprecated: { type: 'boolean' },
      },
    },
    properties: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: {
            type: 'string',
            enum: [
              'string',
              'number',
              'boolean',
              'object',
              'array',
              'enum',
              'unknown',
            ],
          },
          nullable: { type: 'boolean' },
          options: { type: 'object' },
          metadata: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              deprecated: { type: 'boolean' },
            },
          },
        },
        required: ['name', 'type', 'nullable'],
      },
    },
    refIndex: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
  required: ['id', 'name', 'created', 'modified', 'properties', 'refIndex'],
};
