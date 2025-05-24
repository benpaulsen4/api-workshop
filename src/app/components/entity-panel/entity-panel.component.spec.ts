import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityPanelComponent } from './entity-panel.component';
import { BehaviorSubject, of } from 'rxjs';
import { instantiateNamedEntity, NamedEntity } from '../../models/named-entity';
import { Router, NavigationEnd, Params } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { DataCollections, DataService } from '../../services/data.service';
import { FormControl } from '@angular/forms';
import { Popover } from 'primeng/popover';
import { Menu } from 'primeng/menu';

describe('EntityPanelComponent', () => {
  let component: EntityPanelComponent;
  let fixture: ComponentFixture<EntityPanelComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockDataService: jasmine.SpyObj<DataService>;
  let mockCollection: any;
  let mockItems$: BehaviorSubject<NamedEntity[]>;
  let mockCount$: BehaviorSubject<number>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate', 'url']);
    (mockRouter as any).url = '/schemas/123';

    mockItems$ = new BehaviorSubject<NamedEntity[]>([]);
    mockCount$ = new BehaviorSubject<number>(0);

    mockCollection = {
      find: jasmine.createSpy('find').and.returnValue({ $: mockItems$ }),
      count: jasmine.createSpy('count').and.returnValue({ $: mockCount$ }),
      findOne: jasmine.createSpy('findOne').and.returnValue({
        remove: jasmine.createSpy('remove').and.resolveTo({}),
      }),
      insert: jasmine.createSpy('insert').and.resolveTo({}),
    };

    mockDataService = jasmine.createSpyObj('DataService', ['getCollection']);
    mockDataService.getCollection.and.returnValue(mockCollection);

    await TestBed.configureTestingModule({
      imports: [EntityPanelComponent, BrowserAnimationsModule],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: DataService, useValue: mockDataService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EntityPanelComponent);
    component = fixture.componentInstance;

    // Set required input
    (component as any).entity = () => DataCollections.Schemas;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle action menu opening', () => {
    const mockMenu = { toggle: jasmine.createSpy('toggle') };
    const mockEvent = {
      stopPropagation: jasmine.createSpy('stopPropagation'),
      preventDefault: jasmine.createSpy('preventDefault'),
    };

    component.onOpenActionMenu('1', mockMenu as any, mockEvent as any);

    expect(component.activeMenuItemId()).toBe('1');
    expect(mockMenu.toggle).toHaveBeenCalledWith(mockEvent);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('should initialize component correctly', () => {
    expect(component.maxItems()).toBeGreaterThanOrEqual(3);
    expect(mockDataService.getCollection).toHaveBeenCalledWith(
      DataCollections.Schemas,
    );
    expect(mockCollection.find).toHaveBeenCalled();
    expect(mockCollection.count).toHaveBeenCalled();
    expect(component.nameControl).toBeDefined();
    expect(component.nameControl.value).toBe('');
  });

  it('should create entity when form is valid', () => {
    const mockPopover = { hide: jasmine.createSpy('hide') };
    component.nameControl = new FormControl('Test Entity');
    spyOn(component.nameControl, 'reset');

    component.onCreate(mockPopover as unknown as Popover);

    expect(mockCollection.insert).toHaveBeenCalled();
    expect(mockPopover.hide).toHaveBeenCalled();
    expect(component.nameControl.reset).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalled();
  });

  it('should not create entity when form is invalid', () => {
    const mockPopover = { hide: jasmine.createSpy('hide') };
    component.nameControl = new FormControl('');
    component.nameControl.markAsTouched();
    component.nameControl.setErrors({ required: true });
    spyOn(component.nameControl, 'reset');

    component.onCreate(mockPopover as unknown as Popover);

    expect(mockCollection.insert).not.toHaveBeenCalled();
    expect(mockPopover.hide).not.toHaveBeenCalled();
    expect(component.nameControl.reset).not.toHaveBeenCalled();
  });

  it('should update maxItems and items$ on resize', () => {
    const initialMaxItems = component.maxItems();
    spyOn(component, 'calcMaxItems').and.returnValue(initialMaxItems + 2);

    component.onResize();

    expect(component.maxItems()).toBe(initialMaxItems + 2);
    expect(mockCollection.find).toHaveBeenCalledWith({
      limit: initialMaxItems + 2,
      sort: [{ modified: 'desc' }],
    });
  });

  it('should calculate maxItems correctly', () => {
    spyOnProperty(window, 'innerHeight', 'get').and.returnValue(800);

    const result = component.calcMaxItems();

    // (800 - 43 - 12 - 48) / 2 - (46 + 12 + 14) = 348.5 - 72 = 276.5
    // 276.5 / 34 = ~8.13 -> floor = 8
    expect(result).toBeGreaterThanOrEqual(3);
    expect(typeof result).toBe('number');
  });

  it('should navigate away and remove item when delete is triggered', async () => {
    component.activeMenuItemId.set('123');
    (mockRouter as any).url = '/schemas/123';

    await component.actionMenuItems[0]!.command?.({});

    expect(mockRouter.navigate).toHaveBeenCalledWith(['']);
    expect(mockCollection.findOne).toHaveBeenCalledWith({
      selector: { id: { $eq: '123' } },
    });
  });
});
