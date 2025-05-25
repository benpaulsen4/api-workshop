import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { SearchComponent } from './search.component';
import { DataService, DataCollections } from '../../services/data.service';
import { Router } from '@angular/router';
import { PropertyType, Schema } from '../../models/schema';
import { Enum } from '../../models/enum';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('SearchComponent', () => {
  let component: SearchComponent;
  let fixture: ComponentFixture<SearchComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let mockSchemaCollection: any;
  let mockEnumCollection: any;

  // Mock data
  const mockSchemas: Schema[] = [
    {
      id: 'schema1',
      name: 'User',
      nameLower: 'user',
      created: Date.now(),
      modified: Date.now(),
      properties: [{ name: 'id', type: PropertyType.String, nullable: false }],
      refIndex: [],
    },
    {
      id: 'schema2',
      name: 'Product',
      nameLower: 'product',
      created: Date.now(),
      modified: Date.now(),
      properties: [{ name: 'id', type: PropertyType.String, nullable: false }],
      refIndex: [],
    },
  ];

  const mockEnums: Enum[] = [
    {
      id: 'enum1',
      name: 'UserRole',
      nameLower: 'userrole',
      created: Date.now(),
      modified: Date.now(),
      enumType: 'string',
      values: [{ name: 'Admin', value: 'admin' }],
    },
    {
      id: 'enum2',
      name: 'ProductStatus',
      nameLower: 'productstatus',
      created: Date.now(),
      modified: Date.now(),
      enumType: 'string',
      values: [{ name: 'Active', value: 'active' }],
    },
  ];

  beforeEach(async () => {
    // Create spies
    mockSchemaCollection = jasmine.createSpyObj('RxCollection', ['find']);
    mockEnumCollection = jasmine.createSpyObj('RxCollection', ['find']);
    dataServiceSpy = jasmine.createSpyObj('DataService', ['getCollection']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Configure mock behavior
    dataServiceSpy.getCollection.and.callFake((collection: DataCollections) => {
      if (collection === DataCollections.Schemas) {
        return mockSchemaCollection;
      } else {
        return mockEnumCollection;
      }
    });

    // Configure mock find results
    const mockSchemaFindResult = {
      exec: jasmine.createSpy('exec').and.returnValue(Promise.resolve([])),
    };
    const mockEnumFindResult = {
      exec: jasmine.createSpy('exec').and.returnValue(Promise.resolve([])),
    };
    mockSchemaCollection.find.and.returnValue(mockSchemaFindResult);
    mockEnumCollection.find.and.returnValue(mockEnumFindResult);

    await TestBed.configureTestingModule({
      imports: [SearchComponent, NoopAnimationsModule],
      providers: [
        { provide: DataService, useValue: dataServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with correct default values', () => {
    expect(component.visible()).toBeFalse();
    expect(component.searchTerm()).toBe('');
    expect(component.selectedIndex()).toBe(-1);
    expect(component.schemaResults().length).toBe(0);
    expect(component.enumResults().length).toBe(0);
    expect(component.showTip()).toBeFalse();
    expect(component.hasResults()).toBeFalse();
    expect(component.totalResults()).toBe(0);
  });

  it('should open search dialog when onOpen is called', fakeAsync(() => {
    component.onOpen();
    expect(component.visible()).toBeTrue();
    expect(component.showTip()).toBeTrue();
    tick(100);
    fixture.detectChanges();
  }));

  it('should close search dialog when onEscape is called', () => {
    component.visible.set(true);
    component.onEscape();
    expect(component.visible()).toBeFalse();
  });

  it('should search for schemas and enums when searchTerm changes', fakeAsync(() => {
    // Setup mock responses
    const mockSchemaFindResult = {
      exec: jasmine
        .createSpy('exec')
        .and.returnValue(Promise.resolve(mockSchemas)),
    };
    const mockEnumFindResult = {
      exec: jasmine
        .createSpy('exec')
        .and.returnValue(Promise.resolve(mockEnums)),
    };
    mockSchemaCollection.find.and.returnValue(mockSchemaFindResult);
    mockEnumCollection.find.and.returnValue(mockEnumFindResult);

    // Trigger search
    component.searchTerm.set('user');
    tick();
    fixture.detectChanges();

    // Verify search was performed correctly
    expect(mockSchemaCollection.find).toHaveBeenCalledWith({
      selector: { nameLower: { $regex: '.*user.*' } },
      limit: 10,
    });
    expect(mockEnumCollection.find).toHaveBeenCalledWith({
      selector: { nameLower: { $regex: '.*user.*' } },
      limit: 10,
    });

    // Verify results are set
    tick();
    expect(component.schemaResults()).toEqual(mockSchemas);
    expect(component.enumResults()).toEqual(mockEnums);
    expect(component.selectedIndex()).toBe(0);
    expect(component.hasResults()).toBeTrue();
    expect(component.totalResults()).toBe(4);
  }));

  it('should clear results when searchTerm is empty', fakeAsync(() => {
    // Setup mock responses
    const mockSchemaFindResult = {
      exec: jasmine
        .createSpy('exec')
        .and.returnValue(Promise.resolve(mockSchemas)),
    };
    const mockEnumFindResult = {
      exec: jasmine
        .createSpy('exec')
        .and.returnValue(Promise.resolve(mockEnums)),
    };
    mockSchemaCollection.find.and.returnValue(mockSchemaFindResult);
    mockEnumCollection.find.and.returnValue(mockEnumFindResult);

    // Trigger search
    component.searchTerm.set('user');
    tick();
    fixture.detectChanges();

    // Then clear search term
    component.searchTerm.set('');
    tick();
    fixture.detectChanges();

    // Verify results are cleared
    console.log(component.searchTerm());
    expect(component.schemaResults().length).toBe(0);
    expect(component.enumResults().length).toBe(0);
    expect(component.selectedIndex()).toBe(-1);
    expect(component.hasResults()).toBeFalse();
    expect(component.totalResults()).toBe(0);
  }));

  it('should navigate down through results with onArrowDown', () => {
    // Setup test conditions
    component.visible.set(true);
    component.schemaResults.set(mockSchemas);
    component.enumResults.set(mockEnums);
    component.selectedIndex.set(0);

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    spyOn(event, 'preventDefault');

    // Test navigation
    component.onArrowDown(event);
    expect(component.selectedIndex()).toBe(1);
    expect(event.preventDefault).toHaveBeenCalled();

    // Test wrapping around to the beginning
    component.selectedIndex.set(3); // Last item
    component.onArrowDown(event);
    expect(component.selectedIndex()).toBe(0);
  });

  it('should navigate up through results with onArrowUp', () => {
    // Setup test conditions
    component.visible.set(true);
    component.schemaResults.set(mockSchemas);
    component.enumResults.set(mockEnums);
    component.selectedIndex.set(1);

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    spyOn(event, 'preventDefault');

    // Test navigation
    component.onArrowUp(event);
    expect(component.selectedIndex()).toBe(0);
    expect(event.preventDefault).toHaveBeenCalled();

    // Test wrapping around to the end
    component.selectedIndex.set(0); // First item
    component.onArrowUp(event);
    expect(component.selectedIndex()).toBe(3); // Last item
  });

  it('should select current item and navigate on Enter', () => {
    // Setup test conditions
    component.visible.set(true);
    component.schemaResults.set(mockSchemas);
    component.enumResults.set([]);
    component.selectedIndex.set(0);

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    spyOn(event, 'preventDefault');

    // Test selection
    component.onEnter(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['schemas', 'schema1']);
    expect(component.visible()).toBeFalse();
  });

  it('should correctly identify selected schema items', () => {
    component.schemaResults.set(mockSchemas);
    component.enumResults.set(mockEnums);

    // Test schema selection
    component.selectedIndex.set(0);
    expect(component.isItemSelected('schema', 0)).toBeTrue();
    expect(component.isItemSelected('schema', 1)).toBeFalse();
    expect(component.isItemSelected('enum', 0)).toBeFalse();
  });

  it('should correctly identify selected enum items', () => {
    component.schemaResults.set(mockSchemas);
    component.enumResults.set(mockEnums);

    // Test enum selection (after schemas)
    component.selectedIndex.set(2); // First enum (after 2 schemas)
    expect(component.isItemSelected('schema', 0)).toBeFalse();
    expect(component.isItemSelected('enum', 0)).toBeTrue();
    expect(component.isItemSelected('enum', 1)).toBeFalse();
  });

  it('should correctly get item at index', () => {
    component.schemaResults.set(mockSchemas);
    component.enumResults.set(mockEnums);

    // Test getting schema
    expect(component.getItemAtIndex(0)).toBe(mockSchemas[0]);
    expect(component.getItemAtIndex(1)).toBe(mockSchemas[1]);

    // Test getting enum
    expect(component.getItemAtIndex(2)).toBe(mockEnums[0]);
    expect(component.getItemAtIndex(3)).toBe(mockEnums[1]);

    // Test invalid index
    expect(component.getItemAtIndex(-1)).toBeNull();
    expect(component.getItemAtIndex(4)).toBeNull();
  });
});
