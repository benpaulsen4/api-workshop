import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RenamePropertyComponent } from './rename-property.component';
import { ReactiveFormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { InputGroup } from 'primeng/inputgroup';
import { BehaviorSubject } from 'rxjs';
import { signal } from '@angular/core';

describe('RenamePropertyComponent', () => {
  let component: RenamePropertyComponent;
  let fixture: ComponentFixture<RenamePropertyComponent>;
  let existingNames$: BehaviorSubject<string[]>;

  beforeEach(async () => {
    existingNames$ = new BehaviorSubject<string[]>([
      'existingName1',
      'existingName2',
    ]);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, InputText, Button, InputGroup],
    }).compileComponents();

    fixture = TestBed.createComponent(RenamePropertyComponent);
    component = fixture.componentInstance;
    (component.existingPropertyNames as any) = () => existingNames$;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form control with validators', () => {
    expect(component.nameFormControl).toBeDefined();
    expect(component.nameFormControl.hasValidator).toBeTruthy();
  });

  it('should validate required field', () => {
    component.nameFormControl.setValue('');
    expect(component.nameFormControl.errors?.['required']).toBeTruthy();

    component.nameFormControl.setValue('validName');
    expect(component.nameFormControl.errors?.['required']).toBeFalsy();
  });

  it('should validate duplicate names', () => {
    component.nameFormControl.setValue('existingName1');
    fixture.detectChanges();
    expect(component.nameFormControl.errors?.['duplicate']).toBeTruthy();

    component.nameFormControl.setValue('newName');
    fixture.detectChanges();
    expect(component.nameFormControl.errors?.['duplicate']).toBeFalsy();
  });

  it('should not emit renameComplete when form is invalid', () => {
    const emitSpy = spyOn(component.renameComplete, 'emit');
    component.nameFormControl.setValue('');
    component.onSubmit();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit renameComplete with new name when form is valid', () => {
    const emitSpy = spyOn(component.renameComplete, 'emit');
    const newName = 'newValidName';
    component.nameFormControl.setValue(newName);
    component.onSubmit();
    expect(emitSpy).toHaveBeenCalledWith(newName);
  });

  it('should update validation when existingPropertyNames changes', () => {
    component.nameFormControl.setValue('newName');
    expect(component.nameFormControl.errors).toBeFalsy();

    existingNames$.next([...existingNames$.value, 'otherName']);
    component.nameFormControl.setValue('otherName');
    fixture.detectChanges();
    expect(component.nameFormControl.errors?.['duplicate']).toBeTruthy();
  });
});
