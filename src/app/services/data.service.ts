import { Injectable } from '@angular/core';
import { addRxPlugin, createRxDatabase, RxCollection, RxDatabase } from 'rxdb';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { SchemaSchema } from '../models/schema';
import { EnumSchema } from '../models/enum';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private db?: RxDatabase;

  async initializeDatabase() {
    console.log('initializing db');
    addRxPlugin(RxDBDevModePlugin);
    addRxPlugin(RxDBMigrationSchemaPlugin);

    this.db = await createRxDatabase({
      name: 'mydatabase',
      storage: getRxStorageDexie(),
    });

    await this.db.addCollections({
      schemas: {
        schema: SchemaSchema,
        migrationStrategies: {
          1: function (oldDoc) {
            oldDoc.properties = [];
            return oldDoc;
          },
        },
      },
      enums: {
        schema: EnumSchema,
      },
    });
    console.log('db ready');
  }

  getCollection(collection: DataCollections): RxCollection {
    if (!this.db) throw new Error('Database is not initialized');

    return this.db[collection];
  }
}

export enum DataCollections {
  Schemas = 'schemas',
  Enums = 'enums',
}
