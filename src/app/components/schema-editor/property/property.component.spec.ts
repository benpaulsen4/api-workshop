import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PropertyComponent } from './property.component';
import { BehaviorSubject } from 'rxjs';
import { Property, PropertyType } from '../../../models/schema';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { signal, WritableSignal } from '@angular/core';
import {
  RemoveSchemaProperty,
  UpdateChildProperty,
  UpdateEnumEntry,
  UpdateSchemaProperty,
} from '../../../models/edit-actions';
import { EnumEntry } from '../../../models/enum';

describe('PropertyComponent', () => {
  let component: PropertyComponent;
  let fixture: ComponentFixture<PropertyComponent>;
  let existingNames: BehaviorSubject<string[]>;
  let schemaLookup: Record<string, string>;

  beforeEach(async () => {
    existingNames = new BehaviorSubject<string[]>(['existingProp']);
    schemaLookup = {
      User: 'User',
      Address: 'Address',
    };

    await TestBed.configureTestingModule({
      imports: [PropertyComponent, BrowserAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(PropertyComponent);
    component = fixture.componentInstance;

    const mockProperty: Property = {
      name: 'testProperty',
      type: PropertyType.String,
      nullable: true,
    };

    (component.property as any) = signal(mockProperty);
    (component.existingPropertyNames as any) = signal(
      existingNames.asObservable(),
    );
    (component.existingSchemaLookup as any) = signal(schemaLookup);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display correct type string for simple types', () => {
    expect(component.typeString()).toBe('string?');

    (component.property as any).set({
      ...component.property(),
      type: PropertyType.Number,
      options: {
        doublePrecision: true,
      },
    });
    expect(component.typeString()).toBe('number (double)?');
  });

  it('should handle array type properties', () => {
    (component.property as any).set({
      ...component.property(),
      type: PropertyType.Array,
      options: {
        childType: PropertyType.String,
      },
    });

    expect(component.typeString()).toBe('array (string)?');
    expect(component.hasChildProperties()).toBeFalse();
  });

  it('should handle object type properties', () => {
    (component.property as any).set({
      ...component.property(),
      type: PropertyType.Object,
      options: {
        objectType: 'inline',
        childProperties: [
          {
            name: 'childProp',
            type: PropertyType.String,
            created: Date.now(),
            modified: Date.now(),
          },
        ],
      },
    });

    expect(component.hasChildProperties()).toBeTrue();
    expect(component.canAddChildProperties()).toBeTrue();
    expect(component.childProperties().length).toBe(1);
  });

  it('should handle enum type properties', () => {
    (component.property as any).set({
      ...component.property(),
      type: PropertyType.Enum,
      options: {
        enumType: 'string',
        values: [
          { name: 'Option1', value: 'option1' },
          { name: 'Option2', value: 'option2' },
        ],
      },
    });

    expect(component.hasEnumValues()).toBeTrue();
    expect(component.enumValues().length).toBe(2);
  });

  it('should emit property updates', () => {
    const updateSpy = spyOn(component.propertyUpdated, 'emit');

    component.onRenameProperty('newName');

    expect(updateSpy).toHaveBeenCalledOnceWith(
      new UpdateSchemaProperty(
        {
          name: 'testProperty',
          type: PropertyType.String,
          nullable: true,
        },
        {
          name: 'newName',
          type: PropertyType.String,
          nullable: true,
        },
      ),
    );
  });

  it('should emit property deletion', () => {
    const updateSpy = spyOn(component.propertyUpdated, 'emit');

    component.onDeleteProperty();

    expect(updateSpy).toHaveBeenCalledOnceWith(
      new RemoveSchemaProperty({
        name: 'testProperty',
        type: PropertyType.String,
        nullable: true,
      }),
    );
  });

  it('should emit child property addition', () => {
    (component.property as any).set({
      ...component.property(),
      type: PropertyType.Object,
      options: {
        objectType: 'inline',
        childProperties: [],
      },
    });

    const updateSpy = spyOn(component.propertyUpdated, 'emit');
    const childProperty: Property = {
      name: 'childProp',
      type: PropertyType.String,
      nullable: false,
    };

    component.onChildPropertyAdded(childProperty);

    expect(updateSpy).toHaveBeenCalledOnceWith(
      new UpdateSchemaProperty(
        {
          name: 'testProperty',
          type: PropertyType.Object,
          nullable: true,
          options: {
            objectType: 'inline',
            childProperties: [],
          },
        },
        {
          name: 'testProperty',
          type: PropertyType.Object,
          nullable: true,
          options: {
            objectType: 'inline',
            childProperties: [
              {
                name: 'childProp',
                type: PropertyType.String,
                nullable: false,
              },
            ],
          },
        },
      ),
    );
  });

  it('should emit child property updates', () => {
    (component.property as any).set({
      ...component.property(),
      type: PropertyType.Object,
      options: {
        objectType: 'inline',
        childProperties: [
          {
            name: 'childProp',
            type: PropertyType.String,
            nullable: false,
          },
        ],
      },
    });

    const updateSpy = spyOn(component.propertyUpdated, 'emit');

    const childUpdate = new UpdateSchemaProperty(
      {
        name: 'childProp',
        type: PropertyType.String,
        nullable: false,
      },
      {
        name: 'newChild',
        type: PropertyType.String,
        nullable: false,
      },
    );

    component.onChildPropertyUpdated(childUpdate);

    expect(updateSpy).toHaveBeenCalledOnceWith(
      new UpdateChildProperty(
        {
          name: 'testProperty',
          type: PropertyType.Object,
          nullable: true,
          options: {
            objectType: 'inline',
            childProperties: [
              {
                name: 'childProp',
                type: PropertyType.String,
                nullable: false,
              },
            ],
          },
        },
        childUpdate,
      ),
    );
  });

  it('should emit enum entry addition', () => {
    (component.property as any).set({
      ...component.property(),
      type: PropertyType.Enum,
      options: {
        enumType: 'string',
        values: [],
      },
    });

    const updateSpy = spyOn(component.propertyUpdated, 'emit');
    const newEntry: EnumEntry = {
      name: 'newEntry',
      value: 'newEntry',
    };

    component.onEnumEntryAdded(newEntry);

    expect(updateSpy).toHaveBeenCalledOnceWith(
      new UpdateSchemaProperty(
        {
          name: 'testProperty',
          type: PropertyType.Enum,
          nullable: true,
          options: {
            enumType: 'string',
            values: [],
          },
        },
        {
          name: 'testProperty',
          type: PropertyType.Enum,
          nullable: true,
          options: {
            enumType: 'string',
            values: [
              {
                name: 'newEntry',
                value: 'newEntry',
              },
            ],
          },
        },
      ),
    );
  });

  it('should emit enum entry updates', () => {
    (component.property as any).set({
      ...component.property(),
      type: PropertyType.Enum,
      options: {
        enumType: 'string',
        values: [
          {
            name: 'newEntry',
            value: 'newEntry',
          },
        ],
      },
    });

    const updateSpy = spyOn(component.propertyUpdated, 'emit');

    const enumUpdate = new UpdateEnumEntry(
      {
        name: 'newEntry',
        value: 'newEntry',
      },
      {
        name: 'newerEntry',
        value: 'newEntry',
      },
    );

    component.onEnumEntryUpdated(enumUpdate);

    expect(updateSpy).toHaveBeenCalledOnceWith(
      new UpdateChildProperty(
        {
          name: 'testProperty',
          type: PropertyType.Enum,
          nullable: true,
          options: {
            enumType: 'string',
            values: [
              {
                name: 'newEntry',
                value: 'newEntry',
              },
            ],
          },
        },
        enumUpdate,
      ),
    );
  });
});
