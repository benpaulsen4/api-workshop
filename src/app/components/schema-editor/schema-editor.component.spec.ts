import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SchemaEditorComponent } from './schema-editor.component';
import { EditStateService } from '../../services/edit-state.service';
import { DataService } from '../../services/data.service';
import { MessageService } from 'primeng/api';
import { Property, PropertyType, Schema } from '../../models/schema';
import { AddSchemaProperty, EditAction } from '../../models/edit-actions';
import { RxCollection } from 'rxdb';

describe('SchemaEditorComponent', () => {
  let component: SchemaEditorComponent;
  let fixture: ComponentFixture<SchemaEditorComponent>;
  let editStateService: jasmine.SpyObj<EditStateService>;
  let dataService: jasmine.SpyObj<DataService>;
  let messageService: jasmine.SpyObj<MessageService>;
  let mockSchema: Schema;

  beforeEach(async () => {
    mockSchema = {
      id: 'test-id',
      name: 'TestSchema',
      properties: [],
      refIndex: [],
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
    editStateService.entity.and.returnValue(mockSchema);
    editStateService.canUndo.and.returnValue(true);
    editStateService.canRedo.and.returnValue(true);
    editStateService.initialize.and.returnValue(Promise.resolve());

    const mockCollection = {
      find: () => ({
        exec: () =>
          Promise.resolve([
            { id: '1', name: 'Schema1' },
            { id: '2', name: 'Schema2' },
          ]),
      }),
    };
    dataService = jasmine.createSpyObj('DataService', ['getCollection']);
    dataService.getCollection.and.returnValue(mockCollection as RxCollection);

    messageService = jasmine.createSpyObj('MessageService', ['add']);

    await TestBed.configureTestingModule({
      imports: [SchemaEditorComponent],
      providers: [
        { provide: DataService, useValue: dataService },
        { provide: MessageService, useValue: messageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SchemaEditorComponent);
    component = fixture.componentInstance;
    (component.schemaId as any) = () => 'abc';
    (component as any).editStateService = editStateService;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with schema data', () => {
    expect(editStateService.selectCollection).toHaveBeenCalled();
    expect(dataService.getCollection).toHaveBeenCalled();
    expect(component.allSchemaLookup).toBeDefined();
  });

  it('should handle property addition', () => {
    const newProperty: Property = {
      name: 'newProp',
      type: PropertyType.String,
      nullable: false,
    };

    component.onPropertyAdded(newProperty);

    expect(editStateService.addEdit).toHaveBeenCalledWith(
      jasmine.any(AddSchemaProperty),
    );
  });

  it('should handle property updates', () => {
    const mockEdit = {} as EditAction;
    component.onPropertyUpdated(mockEdit);
    expect(editStateService.addEdit).toHaveBeenCalledWith(mockEdit);
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
