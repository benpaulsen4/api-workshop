import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnumEntryComponent } from './enum-entry.component';
import { BehaviorSubject } from 'rxjs';
import { EnumEntry } from '../../../models/enum';
import { RemoveEnumEntry, UpdateEnumEntry } from '../../../models/edit-actions';
import { Metadata } from '../../../models/named-entity';

describe('EnumEntryComponent', () => {
  let component: EnumEntryComponent;
  let fixture: ComponentFixture<EnumEntryComponent>;
  let existingNames: BehaviorSubject<string[]>;
  let existingValues: BehaviorSubject<(string | number)[]>;

  const mockEntry: EnumEntry = {
    name: 'TestEntry',
    value: 'testValue',
    metadata: { description: 'Test description', deprecated: false },
  };

  beforeEach(async () => {
    existingNames = new BehaviorSubject<string[]>(['Existing']);
    existingValues = new BehaviorSubject<(string | number)[]>(['existing']);

    await TestBed.configureTestingModule({
      imports: [EnumEntryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EnumEntryComponent);
    component = fixture.componentInstance;
    (component as any).entry = () => mockEntry;
    (component as any).enumType = () => 'string';
    (component as any).existingEntryNames = () => existingNames.asObservable();
    (component as any).existingEntryValues = () =>
      existingValues.asObservable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit delete action when delete is triggered', () => {
    const updateSpy = spyOn(component.entryUpdated, 'emit');

    component.onDeleteEntry();

    expect(updateSpy).toHaveBeenCalledWith(new RemoveEnumEntry(mockEntry));
  });

  it('should emit update action when entry is renamed', () => {
    const updateSpy = spyOn(component.entryUpdated, 'emit');
    const newName = 'NewName';

    component.onRenameEntry(newName);

    const expectedAction = new UpdateEnumEntry(mockEntry, {
      ...mockEntry,
      name: newName,
    });
    expect(updateSpy).toHaveBeenCalledWith(expectedAction);
  });

  it('should emit update action when value is updated', () => {
    const updateSpy = spyOn(component.entryUpdated, 'emit');
    const newValue = 'newValue';
    const mockPopover = { hide: jasmine.createSpy('hide') };
    (component as any).revaluePopup = () => mockPopover;

    component.onUpdateValue(newValue);

    const expectedAction = new UpdateEnumEntry(mockEntry, {
      ...mockEntry,
      value: newValue,
    });
    expect(updateSpy).toHaveBeenCalledWith(expectedAction);
    expect(mockPopover.hide).toHaveBeenCalled();
  });

  it('should handle numeric values for int enum type', () => {
    const updateSpy = spyOn(component.entryUpdated, 'emit');
    const newValue = 42;
    const mockPopover = { hide: jasmine.createSpy('hide') };
    (component as any).revaluePopup = () => mockPopover;
    (component as any).enumType = () => 'int';

    component.onUpdateValue(newValue);

    const expectedAction = new UpdateEnumEntry(mockEntry, {
      ...mockEntry,
      value: newValue,
    });
    expect(updateSpy).toHaveBeenCalledWith(expectedAction);
  });

  it('should show metadata editor when onEditMetadata is called', () => {
    const mockEvent = new MouseEvent('click');
    const mockPopover = { show: jasmine.createSpy('show') };
    (component as any).metadataEditor = () => mockPopover;

    component.onEditMetadata(mockEvent);

    expect(mockPopover.show).toHaveBeenCalledWith(mockEvent);
    expect(component.editingMetadata()).toBe(true);
  });

  it('should emit update action when metadata is updated', () => {
    const updateSpy = spyOn(component.entryUpdated, 'emit');
    const mockPopover = { hide: jasmine.createSpy('hide') };
    (component as any).metadataEditor = () => mockPopover;

    const newMetadata: Metadata = {
      description: 'Updated description',
      deprecated: true,
    };

    component.onMetadataUpdated(newMetadata);

    const expectedAction = new UpdateEnumEntry(mockEntry, {
      ...mockEntry,
      metadata: newMetadata,
    });

    expect(updateSpy).toHaveBeenCalledWith(expectedAction);
    expect(component.editingMetadata()).toBe(false);
    expect(mockPopover.hide).toHaveBeenCalled();
  });
});
