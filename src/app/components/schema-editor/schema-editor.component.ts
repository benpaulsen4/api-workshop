import {
  Component,
  computed,
  effect,
  input,
  model,
  OnInit,
  signal,
} from '@angular/core';
import { Button } from 'primeng/button';
import { Toolbar } from 'primeng/toolbar';
import { Tooltip } from 'primeng/tooltip';
import { EditStateService } from '../../services/edit-state.service';
import { DataCollections, DataService } from '../../services/data.service';
import { AddPropertyComponent } from './add-property/add-property.component';
import { Property, Schema } from '../../models/schema';
import { PropertyComponent } from './property/property.component';
import {
  AddSchemaProperty,
  EditAction,
  UpdateEntityMetadata,
} from '../../models/edit-actions';
import { BehaviorSubject, map } from 'rxjs';
import { MessageService } from 'primeng/api';
import { PluralPipe } from '../../pipes/plural.pipe';
import { DatePipe } from '@angular/common';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { SchemaToJsonSchemaExportService } from '../../services/schema-to-json-schema-export.service';
import { Metadata, NamedEntity } from '../../models/named-entity';
import { Dialog } from 'primeng/dialog';
import { Tag } from 'primeng/tag';
import { MetadataEditorComponent } from '../metadata-editor/metadata-editor.component';

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
    Tag,
    Dialog,
    MetadataEditorComponent,
  ],
  providers: [EditStateService, SchemaToJsonSchemaExportService],
  templateUrl: './schema-editor.component.html',
  styleUrl: './schema-editor.component.scss',
  host: {
    '(window:keydown.control.z)': 'onUndo()',
    '(window:keydown.control.y)': 'onRedo()',
  },
})
export class SchemaEditorComponent implements OnInit {
  readonly schemaId = input.required<string>();

  readonly idChanged = effect(() => {
    if (this.schemaId() === this.schema()?.id) return;
    this.loading.set(true);

    this.editStateService.initialize(this.schemaId()).then(() => {
      this.propertiesSubject.next(this.schema().properties);
      this.loading.set(false);
    });

    this.dataService
      .getCollection(DataCollections.Schemas)
      .find({
        selector: { refIndex: this.schemaId() },
      })
      .exec()
      .then(schemas => {
        this.schemaReferences.set(schemas);
      });
  });

  readonly schema = computed(() => this.editStateService.entity() as Schema);
  readonly saveState = computed(() => this.editStateService.saveState());
  readonly canUndo = computed(() => this.editStateService.canUndo());
  readonly canRedo = computed(() => this.editStateService.canRedo());

  readonly propertiesSubject = new BehaviorSubject<Property[]>([]); //HACK temporary solution for signals shitty change detection on ref types (mostly arrays)
  readonly propertyNames = this.propertiesSubject.pipe(
    map(a => a.map(p => p.name)),
  );
  readonly loading = signal(true);
  readonly addMode = signal(false);
  readonly schemaReferences = signal<NamedEntity[]>([]);

  readonly metadataVisible = model(false);

  //Lookups are in format Name: id as they are _primarily_ used for selecting available references
  allSchemaLookup!: Record<string, string>;
  allEnumLookup!: Record<string, string>;

  constructor(
    private editStateService: EditStateService,
    private dataService: DataService,
    private messageService: MessageService,
    private exportService: SchemaToJsonSchemaExportService,
  ) {}

  ngOnInit(): void {
    this.editStateService.selectCollection(DataCollections.Schemas);
    this.dataService
      .getCollection(DataCollections.Schemas)
      .find()
      .exec()
      .then(allSchemas => {
        this.allSchemaLookup = allSchemas.reduce((a, b) => {
          a[b.name] = b.id;
          return a;
        }, {});
      });

    this.dataService
      .getCollection(DataCollections.Enums)
      .find()
      .exec()
      .then(allEnums => {
        this.allEnumLookup = allEnums.reduce((a, b) => {
          a[b.name] = b.id;
          return a;
        }, {});
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

  onMetadataUpdated(metadata: Metadata) {
    this.editStateService.addEdit(
      new UpdateEntityMetadata(this.schema().metadata, metadata),
    );
    this.metadataVisible.set(false);
  }

  async onExportToJsonSchema() {
    await this.exportService.export(this.schema());
  }
}
