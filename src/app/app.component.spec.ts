import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { AppComponent } from './app.component';
import { DataService } from './services/data.service';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BehaviorSubject } from 'rxjs';
import { Schema } from './models/schema';
import { Toast } from 'primeng/toast';
import { EntityPanelComponent } from './components/entity-panel/entity-panel.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let messageServiceSpy: jasmine.SpyObj<MessageService>;
  let schemasSubject: BehaviorSubject<Schema[]>;

  beforeEach(async () => {
    schemasSubject = new BehaviorSubject<Schema[]>([]);
    dataServiceSpy = jasmine.createSpyObj('DataService', [
      'initializeDatabase',
      'getCollection',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    messageServiceSpy = jasmine.createSpyObj('MessageService', ['add']);

    dataServiceSpy.initializeDatabase.and.returnValue(Promise.resolve());
    dataServiceSpy.getCollection.and.returnValue({
      find: () => ({ $: schemasSubject.asObservable() }),
      findOne: () => ({
        remove: () => Promise.resolve(),
      }),
      insert: (schema: Schema) => {
        const currentSchemas = schemasSubject.value;
        schemasSubject.next([...currentSchemas, schema]);
      },
    } as any);

    await TestBed.configureTestingModule({
      imports: [Toast, EntityPanelComponent],
      providers: [
        { provide: DataService, useValue: dataServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MessageService, useValue: messageServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize database and set loading to false on success', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(dataServiceSpy.initializeDatabase).toHaveBeenCalled();
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBeNull();
    }));

    it('should handle initialization error', fakeAsync(() => {
      const errorMessage = 'Database initialization failed';
      dataServiceSpy.initializeDatabase.and.returnValue(
        Promise.reject(new Error(errorMessage)),
      );

      fixture.detectChanges();
      tick();

      expect(component.loading()).toBeFalse();
      expect(component.error()).toBe(errorMessage);
    }));
  });

  describe('onCreate', () => {
    it('should create new schema and navigate to it', async () => {
      const schemaName = 'Test Schema';
      routerSpy.navigate.and.returnValue(Promise.resolve(true));

      await component.onCreate(schemaName);

      const createdSchema = schemasSubject.value[0];
      expect(createdSchema.name).toBe(schemaName);
      expect(createdSchema.properties).toEqual([]);
      expect(routerSpy.navigate).toHaveBeenCalledWith([
        'schemas',
        createdSchema.id,
      ]);
    });
  });

  describe('onSelect', () => {
    it('should navigate to selected schema', async () => {
      const schemaId = 'test-id';
      routerSpy.navigate.and.returnValue(Promise.resolve(true));

      await component.onSelect(schemaId);

      expect(routerSpy.navigate).toHaveBeenCalledWith(['schemas', schemaId]);
    });
  });

  describe('onDelete', () => {
    it('should delete schema and navigate away if currently viewing it', async () => {
      const schemaId = 'test-id';
      Object.defineProperty(routerSpy, 'url', {
        value: `/schemas/${schemaId}`,
      });
      routerSpy.navigate.and.returnValue(Promise.resolve(true));

      await component.onDelete(schemaId);

      expect(routerSpy.navigate).toHaveBeenCalledWith([]);
    });

    it('should delete schema without navigation if not currently viewing it', async () => {
      const schemaId = 'test-id';
      Object.defineProperty(routerSpy, 'url', {
        value: '/schemas/different-id',
      });

      await component.onDelete(schemaId);

      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });
});
