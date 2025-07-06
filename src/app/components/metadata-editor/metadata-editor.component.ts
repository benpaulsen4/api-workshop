import { Component, effect, input, output } from '@angular/core';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Textarea } from 'primeng/textarea';
import { Metadata } from '../../models/named-entity';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Button } from 'primeng/button';

@Component({
  selector: 'app-metadata-editor',
  imports: [ToggleSwitch, Textarea, ReactiveFormsModule, Button],
  templateUrl: './metadata-editor.component.html',
  styleUrl: './metadata-editor.component.scss',
})
export class MetadataEditorComponent {
  readonly metadata = input<Metadata | undefined>();

  readonly metadataUpdated = output<Metadata>();

  readonly changed = effect(() => {
    if (this.metadata()) this.metadataForm.patchValue(this.metadata()!);
  });

  metadataForm = new FormGroup<MetadataControls>({
    description: new FormControl(
      this.metadata()?.description ?? '',
      Validators.maxLength(1000),
    ),
    deprecated: new FormControl(this.metadata()?.deprecated ?? false),
  });

  onSave() {
    if (!this.metadataForm.valid) return;

    this.metadataUpdated.emit(this.metadataForm.value as Metadata);
  }
}

export interface MetadataControls {
  description: FormControl<string | null>;
  deprecated: FormControl<boolean | null>;
}
