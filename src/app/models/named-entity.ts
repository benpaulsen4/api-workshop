import { v7 } from 'uuid';
import { DataCollections } from '../services/data.service';
import { Enum } from './enum';
import { Schema } from './schema';

export interface NamedEntity {
  id: string;
  name: string;
  nameLower: string;
  created: number;
  modified: number;
  metadata?: Metadata;
}

export interface Metadata {
  description: string;
  deprecated: boolean;
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
        nameLower: name.toLowerCase(),
        created: Date.now(),
        modified: Date.now(),
        properties: [],
        refIndex: [],
      };
    case DataCollections.Enums:
      return {
        id: v7(),
        name: name,
        nameLower: name.toLowerCase(),
        created: Date.now(),
        modified: Date.now(),
        enumType: 'string',
        values: [],
      };
    default:
      throw new Error('Unknown entity');
  }
}
