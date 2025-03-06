import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RetypePropertyComponent } from './retype-property.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Property, PropertyType } from '../../../models/schema';
import { signal } from '@angular/core';

describe('RetypePropertyComponent', () => {
  let component: RetypePropertyComponent;
  let fixture: ComponentFixture<RetypePropertyComponent>;
  let schemaLookup: Record<string, string>;
  let existingProperty: Property;

  beforeEach(async () => {
    schemaLookup = {
      User: 'User',
      Address: 'Address',
    };

    existingProperty = {
      name: 'testProperty',
      type: PropertyType.String,
      nullable: true,
    };

    await TestBed.configureTestingModule({
      imports: [RetypePropertyComponent, BrowserAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(RetypePropertyComponent);
    component = fixture.componentInstance;
    (component.existingProperty as any) = signal(existingProperty);
    (component.existingSchemaLookup as any) = signal(schemaLookup);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form control and typeahead engine', () => {
    expect(component.typeFormControl).toBeDefined();
    expect(component.typeFormControl.value).toBe('');
    expect(component.typeaheadEngine).toBeDefined();
  });

  it('should provide typeahead suggestions', () => {
    const event = { query: 'object (' };
    component.onTypeahead(event as any);
    expect(component.typeaheadSuggestions).toContain('object (User)');
    expect(component.typeaheadSuggestions).toContain('object (Address)');
  });

  it('should handle invalid type input', () => {
    component.typeFormControl.setValue('invalid!type');
    component.onSubmit();
    expect(component.showTypeError()).toBe(true);
  });

  it('should emit property with preserved children when only nullability changes for inline object', () => {
    const childProperty = {
      name: 'childProp',
      type: PropertyType.String,
      nullable: false,
    };

    (component.existingProperty as any).set({
      name: 'testProperty',
      type: PropertyType.Object,
      nullable: true,
      options: {
        objectType: 'inline',
        childProperties: [childProperty],
      },
    });

    const emitSpy = spyOn(component.retypeComplete, 'emit');
    component.typeFormControl.setValue('object (inline)?');
    component.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({
      name: 'testProperty',
      type: PropertyType.Object,
      nullable: true,
      options: {
        objectType: 'inline',
        childProperties: [childProperty],
      },
    });
  });

  it('should emit property with preserved values when only nullability changes for inline enum', () => {
    const enumValues = [
      { name: 'Option1', value: 'option1' },
      { name: 'Option2', value: 'option2' },
    ];

    (component.existingProperty as any).set({
      name: 'testProperty',
      type: PropertyType.Enum,
      nullable: false,
      options: {
        enumType: 'string',
        values: enumValues,
      },
    });

    const emitSpy = spyOn(component.retypeComplete, 'emit');
    component.typeFormControl.setValue('enum (string)?');
    component.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({
      name: 'testProperty',
      type: PropertyType.Enum,
      nullable: true,
      options: {
        enumType: 'string',
        values: enumValues,
      },
    });
  });

  it('should reset form after successful submission', () => {
    component.typeFormControl.setValue('string');
    component.onSubmit();
    expect(component.typeFormControl.value).toBeNull();
  });
});
