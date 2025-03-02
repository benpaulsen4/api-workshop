import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RenameEntryComponent } from './rename-entry.component';
import { BehaviorSubject } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('RenameEntryComponent', () => {
  let component: RenameEntryComponent;
  let fixture: ComponentFixture<RenameEntryComponent>;
  let existingNames: BehaviorSubject<string[]>;

  beforeEach(async () => {
    existingNames = new BehaviorSubject<string[]>(['Existing']);

    await TestBed.configureTestingModule({
      imports: [RenameEntryComponent, BrowserAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(RenameEntryComponent);
    component = fixture.componentInstance;
    (component as any).existingEntryNames = () => existingNames.asObservable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form control', () => {
    expect(component.nameFormControl).toBeDefined();
    expect(component.nameFormControl.value).toBe('');
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

  it('should emit new name when form is valid', () => {
    const emitSpy = spyOn(component.renameComplete, 'emit');
    const newName = 'NewName';

    component.nameFormControl.setValue(newName);
    component.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith(newName);
  });

  it('should not emit when form is invalid', () => {
    const emitSpy = spyOn(component.renameComplete, 'emit');

    component.nameFormControl.setValue('');
    component.onSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
  });
});