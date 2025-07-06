import { Metadata, NamedEntity } from './named-entity';

export interface Enum extends NamedEntity {
  id: string;
  name: string;
  created: number;
  modified: number;
  metadata?: Metadata;

  enumType: 'string' | 'int';
  values: EnumEntry[];
}

export interface EnumEntry {
  name: string;
  value: string | number;
  metadata?: Metadata;
}

export const EnumSchema = {
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
    enumType: {
      type: 'string',
      enum: ['string', 'int'],
    },
    values: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          value: { oneOf: [{ type: 'string' }, { type: 'number' }] },
          metadata: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              deprecated: { type: 'boolean' },
            },
          },
        },
        required: ['name', 'value'],
      },
    },
  },
  required: ['id', 'name', 'created', 'modified', 'enumType', 'values'],
};
