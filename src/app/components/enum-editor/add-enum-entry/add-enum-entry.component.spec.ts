import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { AddEnumEntryComponent } from './add-enum-entry.component';
import { BehaviorSubject } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('AddEnumEntryComponent', () => {
  let component: AddEnumEntryComponent;
  let fixture: ComponentFixture<AddEnumEntryComponent>;
  let existingNames: BehaviorSubject<string[]>;
  let existingValues: BehaviorSubject<(string | number)[]>;

  beforeEach(async () => {
    existingNames = new BehaviorSubject<string[]>(['Existing']);
    existingValues = new BehaviorSubject<(string | number)[]>(['existing']);

    await TestBed.configureTestingModule({
      imports: [AddEnumEntryComponent, BrowserAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AddEnumEntryComponent);
    component = fixture.componentInstance;
    (component as any).existingEntryNames = () => existingNames.asObservable();
    (component as any).existingEntryValues = () =>
      existingValues.asObservable();
    (component as any).enumType = () => 'string';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form controls', () => {
    expect(component.nameFormControl).toBeDefined();
    expect(component.valueFormControl).toBeDefined();
    expect(component.nameFormControl.value).toBe('');
    expect(component.valueFormControl.value).toBe('');
  });

  it('should validate duplicate names', fakeAsync(() => {
    component.nameFormControl.setValue('Existing');
    tick();
    expect(component.nameFormControl.errors).toBeTruthy();
    expect(component.nameFormControl.errors?.['duplicate']).toBeTruthy();

    component.nameFormControl.setValue('New');
    tick();
    expect(component.nameFormControl.errors).toBeNull();
  }));

  it('should validate duplicate values', fakeAsync(() => {
    component.valueFormControl.setValue('existing');
    tick();
    expect(component.valueFormControl.errors).toBeTruthy();
    expect(component.valueFormControl.errors?.['duplicate']).toBeTruthy();

    component.valueFormControl.setValue('new');
    tick();
    expect(component.valueFormControl.errors).toBeNull();
  }));

  it('should handle Enter key on name input', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    const emitSpy = spyOn(component.entryAdded, 'emit');

    component.nameFormControl.setValue('NewEntry');
    component.onNameKeydown(event);

    expect(emitSpy).toHaveBeenCalled();
    const emittedEntry = emitSpy.calls.first().args[0];
    expect(emittedEntry.name).toBe('NewEntry');
    expect(emittedEntry.value).toBe('newEntry');
  });

  it('should handle Escape key', () => {
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    const emitSpy = spyOn(component.stoppedAddingEntries, 'emit');

    component.onNameKeydown(event);

    expect(emitSpy).toHaveBeenCalled();
  });

  it('should handle equals key for value focus', () => {
    const event = new KeyboardEvent('keydown', { key: '=' });
    const mockValueInput = {
      nativeElement: { focus: jasmine.createSpy('focus') },
    };
    (component as any).valueInput = () => mockValueInput;

    component.onNameKeydown(event);

    expect(mockValueInput.nativeElement.focus).toHaveBeenCalled();
  });

  it('should emit entry when form is valid', () => {
    const emitSpy = spyOn(component.entryAdded, 'emit');

    component.nameFormControl.setValue('NewEntry');
    component.valueFormControl.setValue('newValue');
    component.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({
      name: 'NewEntry',
      value: 'newValue',
    });
  });

  it('should not emit entry when form is invalid', () => {
    const emitSpy = spyOn(component.entryAdded, 'emit');

    component.nameFormControl.setValue('');
    component.valueFormControl.setValue('');
    component.onSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
  });
});
