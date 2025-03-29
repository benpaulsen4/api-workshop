import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnumEditorComponent } from './enum-editor.component';
import { EditStateService } from '../../services/edit-state.service';
import { MessageService } from 'primeng/api';
import { Enum } from '../../models/enum';
import { DataCollections } from '../../services/data.service';
import {
  AddEnumEntry,
  ChangeEnumType,
  EditAction,
} from '../../models/edit-actions';

describe('EnumEditorComponent', () => {
  let component: EnumEditorComponent;
  let fixture: ComponentFixture<EnumEditorComponent>;
  let editStateService: jasmine.SpyObj<EditStateService>;
  let messageService: jasmine.SpyObj<MessageService>;
  let mockEnum: Enum;

  beforeEach(async () => {
    mockEnum = {
      id: 'test-id',
      name: 'TestEnum',
      enumType: 'string',
      values: [],
      created: 1,
      modified: 1,
    };

    editStateService = jasmine.createSpyObj('EditStateService', [
      'initialize',
      'selectCollection',
      'entity',
      'saveState',
      'canUndo',
      'canRedo',
      'addEdit',
      'undoEdit',
      'redoEdit',
    ]);
    editStateService.entity.and.returnValue(mockEnum);
    editStateService.canUndo.and.returnValue(true);
    editStateService.canRedo.and.returnValue(true);
    editStateService.initialize.and.returnValue(Promise.resolve());

    messageService = jasmine.createSpyObj('MessageService', ['add']);

    await TestBed.configureTestingModule({
      imports: [EnumEditorComponent],
      providers: [{ provide: MessageService, useValue: messageService }],
    }).compileComponents();

    fixture = TestBed.createComponent(EnumEditorComponent);
    component = fixture.componentInstance;
    (component.enumId as any) = () => 'test-id';
    (component as any).editStateService = editStateService;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with enum data', () => {
    expect(editStateService.selectCollection).toHaveBeenCalledWith(
      DataCollections.Enums,
    );
    expect(component.enum()).toBe(mockEnum);
  });

  it('should handle entry addition', () => {
    const newEntry = { name: 'NewEntry', value: 'newValue' };
    component.onEntryAdded(newEntry);

    expect(editStateService.addEdit).toHaveBeenCalledWith(
      jasmine.any(AddEnumEntry),
    );
  });

  it('should handle entry updates', () => {
    const mockEdit = {} as EditAction;
    component.onEntryUpdated(mockEdit);
    expect(editStateService.addEdit).toHaveBeenCalledWith(mockEdit);
  });

  it('should handle enum type changes', () => {
    const newType = 'int';
    component.onChangeType(newType);
    expect(editStateService.addEdit).toHaveBeenCalledWith(
      jasmine.any(ChangeEnumType),
    );
  });

  it('should handle undo operation', () => {
    editStateService.undoEdit.and.returnValue('Undone action');
    component.onUndo();
    expect(editStateService.undoEdit).toHaveBeenCalled();
    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'secondary',
      summary: 'Undo',
      detail: 'Undid: Undone action',
    });
  });

  it('should handle redo operation', () => {
    editStateService.redoEdit.and.returnValue('Redone action');
    component.onRedo();
    expect(editStateService.redoEdit).toHaveBeenCalled();
    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'secondary',
      summary: 'Redo',
      detail: 'Redid: Redone action',
    });
  });

  it('should not undo when canUndo is false', () => {
    editStateService.canUndo.and.returnValue(false);
    component.onUndo();
    expect(editStateService.undoEdit).not.toHaveBeenCalled();
  });

  it('should not redo when canRedo is false', () => {
    editStateService.canRedo.and.returnValue(false);
    component.onRedo();
    expect(editStateService.redoEdit).not.toHaveBeenCalled();
  });
});
