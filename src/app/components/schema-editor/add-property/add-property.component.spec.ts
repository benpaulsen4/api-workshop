import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { AddPropertyComponent } from './add-property.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject } from 'rxjs';

describe('AddPropertyComponent', () => {
  let component: AddPropertyComponent;
  let fixture: ComponentFixture<AddPropertyComponent>;
  let existingNames: BehaviorSubject<string[]>;
  let schemaLookup: Record<string, string>;

  beforeEach(async () => {
    existingNames = new BehaviorSubject<string[]>(['existingProp']);
    schemaLookup = {
      User: 'User',
      Address: 'Address',
    };

    await TestBed.configureTestingModule({
      imports: [AddPropertyComponent, BrowserAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AddPropertyComponent);
    component = fixture.componentInstance;
    (component as any).existingPropertyNames = () =>
      existingNames.asObservable();
    (component as any).existingSchemaLookup = () => schemaLookup;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form controls', () => {
    expect(component.nameFormControl).toBeDefined();
    expect(component.typeFormControl).toBeDefined();
    expect(component.nameFormControl.value).toBe('');
    expect(component.typeFormControl.value).toBe('');
  });

  it('should validate duplicate names', fakeAsync(() => {
    component.nameFormControl.setValue('existingProp');
    tick();
    expect(component.nameFormControl.errors).toBeTruthy();
    expect(component.nameFormControl.errors?.['duplicate']).toBeTruthy();

    component.nameFormControl.setValue('newProp');
    tick();
    expect(component.nameFormControl.errors).toBeNull();
  }));

  it('should handle colon key for type focus', () => {
    const event = new KeyboardEvent('keydown', { key: ':' });
    const mockTypeInput = {
      inputEL: { nativeElement: { focus: jasmine.createSpy('focus') } },
    };
    (component as any).typeInput = () => mockTypeInput;

    component.onNameKeydown(event);

    expect(mockTypeInput.inputEL.nativeElement.focus).toHaveBeenCalled();
  });

  it('should provide typeahead suggestions', () => {
    const event = { query: 'object (' };
    component.onTypeahead(event as any);
    expect(component.typeaheadSuggestions).toContain('object (User)');
  });

  it('should handle valid type input and emit property', fakeAsync(() => {
    const emitSpy = spyOn(component.propertyAdded, 'emit');
    const mockNameInput = {
      nativeElement: { focus: jasmine.createSpy('focus') },
    };
    (component as any).nameInput = () => mockNameInput;

    component.nameFormControl.setValue('newProp');
    component.typeFormControl.setValue('string');
    component.onTypeEnterKeydown();
    tick(1);

    expect(emitSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name: 'newProp',
        type: 'string',
      }),
    );
    expect(component.nameFormControl.value).toBe(null);
    expect(component.typeFormControl.value).toBe(null);
    expect(mockNameInput.nativeElement.focus).toHaveBeenCalled();
  }));

  it('should handle invalid type input', () => {
    component.nameFormControl.setValue('newProp');
    component.typeFormControl.setValue('invalid!type');
    component.onTypeEnterKeydown();

    expect(component.showTypeError()).toBe(true);
  });

  it('should emit stop event when both inputs are empty on blur', () => {
    const emitSpy = spyOn(component.stoppedAddingProperties, 'emit');

    component.nameFormControl.setValue('');
    component.typeFormControl.setValue('');
    component.onBlur();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('should not emit stop event when inputs have values on blur', () => {
    const emitSpy = spyOn(component.stoppedAddingProperties, 'emit');

    component.nameFormControl.setValue('newProp');
    component.onBlur();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should correctly extract error codes', () => {
    const errors = { required: true, duplicate: true };
    expect(component.errorCodesOf(errors)).toEqual(['required', 'duplicate']);
    expect(component.errorCodesOf(null)).toEqual([]);
  });
});
