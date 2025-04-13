import { EnumEntry } from './enum';
import { NamedEntity } from './named-entity';

export interface Schema extends NamedEntity {
  id: string;
  name: string;
  created: number;
  modified: number;

  properties: Property[];
  refIndex: string[];
}

export interface Property {
  name: string;
  type: PropertyType;
  nullable: boolean;
  options?: PropertyOptions;
}

export type PropertyOptions =
  | NumberOptions
  | ObjectOptions
  | ArrayOptions
  | EnumOptions;

export enum PropertyType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
  Enum = 'enum',
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

export const SchemaSchema = {
  version: 2,
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
    created: {
      type: 'number',
    },
    modified: {
      type: 'number',
    },
    properties: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: {
            type: 'string',
            enum: ['string', 'number', 'boolean', 'object', 'array', 'enum'],
          },
          nullable: { type: 'boolean' },
          options: { type: 'object' },
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
