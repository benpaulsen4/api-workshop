import { NamedEntity } from './named-entity';

export interface Schema extends NamedEntity {
  id: string;
  name: string;
  created: number;
  modified: number;
}

export const SchemaSchema = {
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
  },
  required: ['id', 'name', 'created', 'modified'],
};
