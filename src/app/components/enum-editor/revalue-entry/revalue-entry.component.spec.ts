import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { RevalueEntryComponent } from './revalue-entry.component';
import { BehaviorSubject } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('RevalueEntryComponent', () => {
  let component: RevalueEntryComponent;
  let fixture: ComponentFixture<RevalueEntryComponent>;
  let existingValues: BehaviorSubject<(string | number)[]>;

  beforeEach(async () => {
    existingValues = new BehaviorSubject<(string | number)[]>(['existing']);

    await TestBed.configureTestingModule({
      imports: [RevalueEntryComponent, BrowserAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(RevalueEntryComponent);
    component = fixture.componentInstance;
    (component as any).existingEntryValues = () =>
      existingValues.asObservable();
    (component as any).enumType = () => 'string';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form control', () => {
    expect(component.valueFormControl).toBeDefined();
    expect(component.valueFormControl.value).toBe('');
  });

  it('should validate duplicate values', fakeAsync(() => {
    component.valueFormControl.setValue('existing');
    tick();
    expect(component.valueFormControl.errors).toBeTruthy();
    expect(component.valueFormControl.errors?.['duplicate']).toBeTruthy();

    component.valueFormControl.setValue('new');
    tick();
    expect(component.valueFormControl.errors).toBeNull();
  }));

  it('should emit string value when enum type is string', () => {
    const emitSpy = spyOn(component.revalueComplete, 'emit');
    const newValue = 'newValue';

    component.valueFormControl.setValue(newValue);
    component.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith(newValue);
  });

  it('should emit number value when enum type is int', () => {
    const emitSpy = spyOn(component.revalueComplete, 'emit');
    (component as any).enumType = () => 'int';
    const newValue = '42';

    component.valueFormControl.setValue(newValue);
    component.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith(42);
  });

  it('should not emit when form is invalid', () => {
    const emitSpy = spyOn(component.revalueComplete, 'emit');

    component.valueFormControl.setValue('');
    component.onSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
  });
});
