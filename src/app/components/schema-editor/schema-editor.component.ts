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

@Component({
  selector: 'app-schema-editor',
  standalone: true,
  imports: [Toolbar, Button, Tooltip, AddPropertyComponent, PropertyComponent],
  providers: [EditStateService],
  templateUrl: './schema-editor.component.html',
  styleUrl: './schema-editor.component.scss',
})
export class SchemaEditorComponent implements OnInit {
  readonly schemaId = input.required<string>();

  readonly schema = computed(() => this.editStateService.entity() as Schema);
  readonly saveState = computed(() => this.editStateService.saveState());

  readonly propertiesSubject = new BehaviorSubject<Property[]>([]); //todo temporary solution for signals shitty change detection on ref types (mostly arrays)
  readonly propertyNames = this.propertiesSubject.pipe(
    map((a) => a.map((p) => p.name)),
  );
  readonly loading = signal(true);
  readonly addMode = signal(false);

  constructor(private editStateService: EditStateService) {}

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
}
