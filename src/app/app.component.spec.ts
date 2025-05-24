import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { AppComponent } from './app.component';
import { DataService } from './services/data.service';
import { Toast } from 'primeng/toast';
import { EntityPanelComponent } from './components/entity-panel/entity-panel.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;

  beforeEach(async () => {
    dataServiceSpy = jasmine.createSpyObj('DataService', [
      'initializeDatabase',
    ]);

    dataServiceSpy.initializeDatabase.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [Toast, EntityPanelComponent],
      providers: [{ provide: DataService, useValue: dataServiceSpy }],
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
});
