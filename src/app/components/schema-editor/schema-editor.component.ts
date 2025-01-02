import { Component, computed, input, OnInit, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { Toolbar } from 'primeng/toolbar';
import { Tooltip } from 'primeng/tooltip';
import { EditStateService } from '../../services/edit-state.service';
import { DataCollections } from '../../services/data.service';
import { AddPropertyComponent } from './add-property/add-property.component';
import { Property, Schema } from '../../models/schema';
import { PropertyComponent } from './property/property.component';
import { AddSchemaProperty, EditAction } from '../../models/edit-actions';
import { BehaviorSubject, map } from 'rxjs';
import { MessageService } from 'primeng/api';
import { PluralPipe } from '../../pipes/plural.pipe';
import { DatePipe } from '@angular/common';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';

@Component({
  selector: 'app-schema-editor',
  standalone: true,
  imports: [
    Toolbar,
    Button,
    Tooltip,
    AddPropertyComponent,
    PropertyComponent,
    PluralPipe,
    DatePipe,
    TimeAgoPipe,
  ],
  providers: [EditStateService],
  templateUrl: './schema-editor.component.html',
  styleUrl: './schema-editor.component.scss',
  host: {
    '(window:keydown.control.z)': 'onUndo()',
    '(window:keydown.control.y)': 'onRedo()',
  },
})
export class SchemaEditorComponent implements OnInit {
  readonly schemaId = input.required<string>();

  readonly schema = computed(() => this.editStateService.entity() as Schema);
  readonly saveState = computed(() => this.editStateService.saveState());
  readonly canUndo = computed(() => this.editStateService.canUndo());
  readonly canRedo = computed(() => this.editStateService.canRedo());

  readonly propertiesSubject = new BehaviorSubject<Property[]>([]); //todo temporary solution for signals shitty change detection on ref types (mostly arrays)
  readonly propertyNames = this.propertiesSubject.pipe(
    map((a) => a.map((p) => p.name)),
  );
  readonly loading = signal(true);
  readonly addMode = signal(false);

  constructor(
    private editStateService: EditStateService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.editStateService.selectCollection(DataCollections.Schemas);
    this.editStateService.initialize(this.schemaId()).then(() => {
      this.loading.set(false);
      this.propertiesSubject.next(this.schema().properties);
    });
  }

  onPropertyAdded(prop: Property) {
    this.editStateService.addEdit(new AddSchemaProperty(prop));
    this.propertiesSubject.next(this.schema().properties);
  }

  onPropertyUpdated(edit: EditAction) {
    this.editStateService.addEdit(edit);
    this.propertiesSubject.next(this.schema().properties);
  }

  onUndo() {
    if (!this.canUndo()) return;
    const change = this.editStateService.undoEdit();
    this.messageService.add({
      severity: 'secondary',
      summary: 'Undo',
      detail: `Undid: ${change}`,
    });
  }

  onRedo() {
    if (!this.canRedo()) return;
    const change = this.editStateService.redoEdit();
    this.messageService.add({
      severity: 'secondary',
      summary: 'Redo',
      detail: `Redid: ${change}`,
    });
  }
}
