import { NamedEntity } from './named-entity';

export interface Enum extends NamedEntity {
  id: string;
  name: string;
  created: number;
  modified: number;

  enumType: 'string' | 'int';
  values: EnumEntry[];
}

export interface EnumEntry {
  name: string;
  value: string | number;
}

export const EnumSchema = {
  version: 0,
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
        },
        required: ['name', 'value'],
      },
    },
  },
  required: ['id', 'name', 'created', 'modified', 'enumType', 'values'],
};
