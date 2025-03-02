import { TestBed } from '@angular/core/testing';
import { DataService, DataCollections } from './data.service';
import { RxCollection, RxDatabase } from 'rxdb';

describe('DataService', () => {
  let service: DataService;
  let mockDb: jasmine.SpyObj<RxDatabase>;
  let mockCollection: jasmine.SpyObj<RxCollection>;

  beforeEach(() => {
    mockCollection = jasmine.createSpyObj('RxCollection', ['findOne']);
    mockDb = jasmine.createSpyObj('RxDatabase', ['addCollections']);

    // Set up the mock database with collections property
    Object.defineProperty(mockDb, DataCollections.Schemas, {
      get: () => mockCollection,
      configurable: true,
    });

    TestBed.configureTestingModule({
      providers: [DataService],
    });
    service = TestBed.inject(DataService);

    // Replace the private db property with our mock
    (service as any).db = mockDb;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should throw error when getting collection if database is not initialized', () => {
    // Set db to undefined to simulate uninitialized state
    (service as any).db = undefined;

    expect(() => {
      service.getCollection(DataCollections.Schemas);
    }).toThrowError('Database is not initialized');
  });

  it('should return the correct collection when database is initialized', () => {
    const collection = service.getCollection(DataCollections.Schemas);
    expect(collection).toBe(mockCollection);
  });
});
