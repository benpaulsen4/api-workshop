import { v7 } from 'uuid';
import { DataCollections } from '../services/data.service';
import { Enum } from './enum';
import { Schema } from './schema';

export interface NamedEntity {
  id: string;
  name: string;
  created: number;
  modified: number;
}

export function instantiateNamedEntity(
  entity: DataCollections,
  name: string,
): Schema | Enum {
  switch (entity) {
    case DataCollections.Schemas:
      return {
        id: v7(),
        name: name,
        created: Date.now(),
        modified: Date.now(),
        properties: [],
        refIndex: [],
      };
    case DataCollections.Enums:
      return {
        id: v7(),
        name: name,
        created: Date.now(),
        modified: Date.now(),
        enumType: 'string',
        values: [],
      };
    default:
      throw new Error('Unknown entity');
  }
}
