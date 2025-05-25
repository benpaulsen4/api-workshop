import { TestBed } from '@angular/core/testing';
import { EditStateService } from './edit-state.service';
import { DataService, DataCollections } from './data.service';
import { DestroyRef } from '@angular/core';
import { EditAction } from '../models/edit-actions';
import { NamedEntity } from '../models/named-entity';

describe('EditStateService', () => {
  let service: EditStateService;
  let dataService: jasmine.SpyObj<DataService>;
  let mockCollection: any;
  let mockEntity: NamedEntity;

  beforeEach(() => {
    mockCollection = {
      findOne: jasmine.createSpy('findOne').and.returnValue({
        exec: () =>
          Promise.resolve({ toMutableJSON: () => ({ ...mockEntity }) }),
      }),
    };

    mockEntity = {
      id: 'test-id',
      name: 'Test Entity',
      nameLower: 'test entity',
      created: Date.now(),
      modified: Date.now(),
    };

    dataService = jasmine.createSpyObj('DataService', ['getCollection']);
    dataService.getCollection.and.returnValue(mockCollection);

    TestBed.configureTestingModule({
      providers: [
        EditStateService,
        { provide: DataService, useValue: dataService },
        { provide: DestroyRef, useValue: { onDestroy: jasmine.createSpy() } },
      ],
    });
    service = TestBed.inject(EditStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with an entity', async () => {
    service.selectCollection(DataCollections.Schemas);
    await service.initialize('test-id');

    expect(service.entity()).toBeTruthy();
    expect(service.entity()?.id).toBe('test-id');
    expect(service.saveState()).toBe('noChange');
  });

  it('should throw error if collection not selected before initialization', async () => {
    await expectAsync(service.initialize('test-id')).toBeRejectedWithError(
      'Select a collection first',
    );
  });

  it('should handle edit actions', async () => {
    const mockAction: EditAction = {
      apply: jasmine.createSpy('apply'),
      revert: jasmine.createSpy('revert'),
      describe: jasmine.createSpy('describe'),
    };

    service.selectCollection(DataCollections.Schemas);
    await service.initialize('test-id');

    service.addEdit(mockAction);
    expect(service.canUndo()).toBe(true);
    expect(service.canRedo()).toBe(false);
    expect(service.saveState()).toBe('unsaved');
  });

  it('should handle undo/redo operations', async () => {
    const mockAction: EditAction = {
      apply: jasmine.createSpy('apply'),
      revert: jasmine.createSpy('revert'),
      describe: jasmine.createSpy('describe'),
    };

    service.selectCollection(DataCollections.Schemas);
    await service.initialize('test-id');

    service.addEdit(mockAction);
    service.undoEdit();

    expect(service.canUndo()).toBe(false);
    expect(service.canRedo()).toBe(true);

    service.redoEdit();
    expect(service.canUndo()).toBe(true);
    expect(service.canRedo()).toBe(false);
  });
});
