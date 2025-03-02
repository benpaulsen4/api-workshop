import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityPanelComponent } from './entity-panel.component';
import { BehaviorSubject } from 'rxjs';
import { NamedEntity } from '../../models/named-entity';
import { Router, NavigationEnd, Params } from '@angular/router';
import { FormControl } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';

describe('EntityPanelComponent', () => {
  let component: EntityPanelComponent;
  let fixture: ComponentFixture<EntityPanelComponent>;
  let router: jasmine.SpyObj<Router>;
  let routerEvents: BehaviorSubject<any>;
  let routerParams: BehaviorSubject<Params>;

  const mockItems: NamedEntity[] = [
    { id: '1', name: 'Entity 1', created: 1, modified: 1 },
    { id: '2', name: 'Entity 2', created: 1, modified: 1 },
  ];

  beforeEach(async () => {
    routerEvents = new BehaviorSubject<any>(new NavigationEnd(1, '/', '/'));
    routerParams = new BehaviorSubject<Params>({ id: '1' });

    router = jasmine.createSpyObj('Router', ['events'], {
      routerState: {
        root: {
          firstChild: {
            params: routerParams,
          },
        },
      },
      events: routerEvents,
    });

    await TestBed.configureTestingModule({
      imports: [EntityPanelComponent, BrowserAnimationsModule],
      providers: [{ provide: Router, useValue: router }],
    }).compileComponents();

    fixture = TestBed.createComponent(EntityPanelComponent);
    component = fixture.componentInstance;
    (component as any).items = signal(new BehaviorSubject(mockItems));
    (component as any).entityName = signal('Test Entity');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit create event with valid name', () => {
    const createSpy = spyOn(component.create, 'emit');
    const mockPopover = { hide: jasmine.createSpy('hide') };

    component.nameControl.setValue('New Entity');
    component.onCreate(mockPopover as any);

    expect(createSpy).toHaveBeenCalledWith('New Entity');
    expect(mockPopover.hide).toHaveBeenCalled();
    expect(component.nameControl.value).toBeNull();
  });

  it('should not emit create event with invalid name', () => {
    const createSpy = spyOn(component.create, 'emit');
    const mockPopover = { hide: jasmine.createSpy('hide') };

    component.nameControl.setValue('');
    component.onCreate(mockPopover as any);

    expect(createSpy).not.toHaveBeenCalled();
    expect(mockPopover.hide).not.toHaveBeenCalled();
  });

  it('should handle action menu opening', () => {
    const mockMenu = { toggle: jasmine.createSpy('toggle') };
    const mockEvent = { stopPropagation: jasmine.createSpy('stopPropagation') };

    component.onOpenActionMenu('1', mockMenu as any, mockEvent as any);

    expect(component.activeMenuItemId()).toBe('1');
    expect(mockMenu.toggle).toHaveBeenCalledWith(mockEvent);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should emit delete event when action menu delete is triggered', () => {
    const deleteSpy = spyOn(component.delete, 'emit');

    component.onOpenActionMenu(
      '1',
      { toggle: () => {} } as any,
      { stopPropagation: () => {} } as any,
    );
    component.actionMenuItems[0].command!({});

    expect(deleteSpy).toHaveBeenCalledWith('1');
  });

  it('should update selected item on navigation', () => {
    routerParams.next({ entityId: '2' });

    expect(component.selectedItem()).toBe('2');
  });

  it('should handle item click events', () => {
    const itemClickSpy = spyOn(component.itemClick, 'emit');
    component.itemClick.emit('1');

    expect(itemClickSpy).toHaveBeenCalledWith('1');
  });
});
