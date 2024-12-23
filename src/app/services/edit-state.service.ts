import { DestroyRef, Injectable, signal } from '@angular/core';
import { DataCollections, DataService } from './data.service';
import { RxCollection } from 'rxdb';
import { NamedEntity } from '../models/named-entity';
import { EditAction } from '../models/edit-actions';
import { debounceTime, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable()
export class EditStateService {
  private collection?: RxCollection;
  private entityId?: string;

  private undoStack: EditAction[] = [];
  private redoStack: EditAction[] = [];
  private saveEdit = new Subject<void>();

  entity = signal<NamedEntity | undefined>(undefined);
  saveState = signal<'noChange' | 'unsaved' | 'saving' | 'saved'>('noChange');

  constructor(
    private dataService: DataService,
    private destroyRef: DestroyRef,
  ) {}

  selectCollection(collection: DataCollections) {
    this.collection = this.dataService.getCollection(collection);
  }

  async initialize(id: string) {
    if (!this.collection) throw new Error('Select a collection first');
    this.entityId = id;
    this.entity.set(
      (
        await this.collection.findOne({ selector: { id: { $eq: id } } }).exec()
      ).toMutableJSON(),
    );

    if (!this.entity()) throw new Error('Entity not found');

    this.saveEdit
      .pipe(takeUntilDestroyed(this.destroyRef), debounceTime(1000))
      .subscribe(async () => {
        if (!this.collection || !this.entity())
          throw new Error('Cannot save: uninitialized');

        this.saveState.set('saving');
        await this.collection.upsert(structuredClone(this.entity()!)); //todo may need to refactor this - performance intensive
        this.saveState.set('saved');
      });
  }

  addEdit(action: EditAction) {
    if (!this.collection || !this.entity())
      throw new Error('Cannot edit: uninitialized');

    this.entity.update((entity) => {
      action.apply(entity!);
      entity!.modified = Date.now();
      return entity;
    });

    this.undoStack.push(action);
    this.redoStack = [];
    this.saveState.set('unsaved');
    this.saveEdit.next();
  }

  undoEdit() {
    if (!this.collection || !this.entity())
      throw new Error('Cannot undo: uninitialized');

    const lastEdit = this.undoStack.pop();
    if (!lastEdit) throw new Error('Cannot undo: no changes to undo');

    this.entity.update((entity) => {
      lastEdit.revert(entity!);
      entity!.modified = Date.now();
      return entity;
    });

    this.redoStack.push(lastEdit);
    this.saveState.set('unsaved');
    this.saveEdit.next();
  }

  redoEdit() {
    if (!this.collection || !this.entity())
      throw new Error('Cannot redo: uninitialized');

    const lastUndo = this.redoStack.pop();
    if (!lastUndo) throw new Error('Cannot redo: no undone changes to redo');

    this.entity.update((entity) => {
      lastUndo.apply(entity!);
      entity!.modified = Date.now();
      return entity;
    });

    this.undoStack.push(lastUndo);
    this.saveState.set('unsaved');
    this.saveEdit.next();
  }
}
