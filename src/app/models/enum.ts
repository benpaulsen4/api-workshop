import { NamedEntity } from "./named-entity";

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