import {
  computed,
  DestroyRef,
  Injectable,
  signal,
  WritableSignal,
} from '@angular/core';
import { DataCollections, DataService } from './data.service';
import { RxCollection } from 'rxdb';
import { NamedEntity } from '../models/named-entity';
import { EditAction } from '../models/edit-actions';
import { debounceTime, Subject, takeUntil } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable()
export class EditStateService {
  private collection?: RxCollection;

  private readonly saveEdit = new Subject<void>();
  private readonly entityChanged = new Subject<void>();
  private readonly undoStack: WritableSignal<EditAction[]> = signal([]);
  private readonly redoStack: WritableSignal<EditAction[]> = signal([]);

  readonly entity = signal<NamedEntity | undefined>(undefined);
  readonly saveState = signal<'noChange' | 'unsaved' | 'saving' | 'saved'>(
    'noChange',
  );

  readonly canUndo = computed(() => !!this.undoStack().length);
  readonly canRedo = computed(() => !!this.redoStack().length);

  constructor(
    private dataService: DataService,
    private destroyRef: DestroyRef,
  ) {}

  selectCollection(collection: DataCollections) {
    this.collection = this.dataService.getCollection(collection);
  }

  async initialize(id: string) {
    if (!this.collection) throw new Error('Select a collection first');

    this.entityChanged.next();
    if (this.saveState() === 'unsaved') {
      await this.saveInternal();
    }

    this.entity.set(undefined);
    this.saveState.set('noChange');
    this.undoStack.set([]);
    this.redoStack.set([]);

    this.entity.set(
      (
        await this.collection.findOne({ selector: { id: { $eq: id } } }).exec()
      ).toMutableJSON(),
    );

    if (!this.entity()) throw new Error('Entity not found');

    this.saveEdit
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        takeUntil(this.entityChanged),
        debounceTime(1000),
      )
      .subscribe(this.saveInternal.bind(this));
  }

  addEdit(action: EditAction) {
    if (!this.collection || !this.entity())
      throw new Error('Cannot edit: uninitialized');

    this.entity.update(entity => {
      action.apply(entity!);
      entity!.modified = Date.now();
      return entity;
    });

    this.undoStack.update(s => {
      s.push(action);
      return [...s];
    });

    this.redoStack.set([]);
    this.saveState.set('unsaved');
    this.saveEdit.next();
  }

  undoEdit() {
    if (!this.collection || !this.entity())
      throw new Error('Cannot undo: uninitialized');

    let lastEdit: EditAction | undefined;

    this.undoStack.update(s => {
      lastEdit = s.pop();
      return [...s];
    });

    if (!lastEdit) throw new Error('Cannot undo: no changes to undo');

    this.entity.update(entity => {
      lastEdit!.revert(entity!);
      entity!.modified = Date.now();
      return entity;
    });

    this.redoStack.update(s => {
      s.push(lastEdit!);
      return [...s];
    });

    this.saveState.set('unsaved');
    this.saveEdit.next();

    return lastEdit.describe();
  }

  redoEdit() {
    if (!this.collection || !this.entity())
      throw new Error('Cannot redo: uninitialized');

    let lastUndo: EditAction | undefined;

    this.redoStack.update(s => {
      lastUndo = s.pop();
      return [...s];
    });

    if (!lastUndo) throw new Error('Cannot redo: no undone changes to redo');

    this.entity.update(entity => {
      lastUndo!.apply(entity!);
      entity!.modified = Date.now();
      return entity;
    });

    this.undoStack.update(s => {
      s.push(lastUndo!);
      return [...s];
    });

    this.saveState.set('unsaved');
    this.saveEdit.next();

    return lastUndo.describe();
  }

  private async saveInternal() {
    if (!this.collection || !this.entity())
      throw new Error('Cannot save: uninitialized');

    this.saveState.set('saving');
    await this.collection.upsert(structuredClone(this.entity()!));
    this.saveState.set('saved');
  }
}
