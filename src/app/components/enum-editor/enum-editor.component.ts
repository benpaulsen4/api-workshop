import {
  Component,
  computed,
  effect,
  input,
  model,
  OnInit,
  signal,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { DataCollections, DataService } from '../../services/data.service';
import { EditStateService } from '../../services/edit-state.service';
import { Enum, EnumEntry } from '../../models/enum';
import { Toolbar } from 'primeng/toolbar';
import { PluralPipe } from '../../pipes/plural.pipe';
import { AsyncPipe, DatePipe } from '@angular/common';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { Button } from 'primeng/button';
import { Tooltip } from 'primeng/tooltip';
import { EnumEntryComponent } from './enum-entry/enum-entry.component';
import { AddEnumEntryComponent } from './add-enum-entry/add-enum-entry.component';
import { BehaviorSubject, map } from 'rxjs';
import {
  AddEnumEntry,
  ChangeEnumType,
  EditAction,
  UpdateEntityMetadata,
} from '../../models/edit-actions';
import { SelectButton } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { Message } from 'primeng/message';
import { Metadata, NamedEntity } from '../../models/named-entity';
import { MetadataEditorComponent } from '../metadata-editor/metadata-editor.component';
import { Dialog } from 'primeng/dialog';
import { Tag } from 'primeng/tag';

@Component({
  selector: 'app-enum-editor',
  imports: [
    Toolbar,
    PluralPipe,
    DatePipe,
    TimeAgoPipe,
    Button,
    Tooltip,
    EnumEntryComponent,
    AddEnumEntryComponent,
    SelectButton,
    FormsModule,
    Message,
    AsyncPipe,
    MetadataEditorComponent,
    Dialog,
    Tag,
  ],
  providers: [EditStateService],
  templateUrl: './enum-editor.component.html',
  styleUrl: './enum-editor.component.scss',
})
export class EnumEditorComponent implements OnInit {
  readonly enumId = input.required<string>();

  readonly loading = signal(true);
  readonly addMode = signal(false);
  readonly schemaReferences = signal<NamedEntity[]>([]);

  readonly enum = computed(() => this.editStateService.entity() as Enum);
  readonly saveState = computed(() => this.editStateService.saveState());
  readonly canUndo = computed(() => this.editStateService.canUndo());
  readonly canRedo = computed(() => this.editStateService.canRedo());

  readonly metadataVisible = model(false);

  readonly idChanged = effect(() => {
    if (this.enumId() === this.enum()?.id) return;
    this.loading.set(true);
    this.editStateService.initialize(this.enumId()).then(() => {
      this.entriesSubject.next(this.enum().values);
      this.loading.set(false);
    });
    this.dataService
      .getCollection(DataCollections.Schemas)
      .find({
        selector: { refIndex: this.enumId() },
      })
      .exec()
      .then(schemas => {
        this.schemaReferences.set(schemas);
      });
  });

  readonly entriesSubject = new BehaviorSubject<EnumEntry[]>([]); // HACK for same reason as schema editor, though I'm pretty sure I know how to fix this now - leaving as is for consistency
  readonly entryNames = this.entriesSubject.pipe(
    map(entries => entries.map(e => e.name)),
  );
  readonly entryValues = this.entriesSubject.pipe(
    map(entries => entries.map(e => e.value)),
  );
  readonly canChangeType = this.entriesSubject.pipe(
    map(entries => !entries.length),
  );

  constructor(
    private editStateService: EditStateService,
    private messageService: MessageService,
    private dataService: DataService,
  ) {}

  ngOnInit(): void {
    this.editStateService.selectCollection(DataCollections.Enums);
  }

  onEntryAdded(entry: EnumEntry) {
    this.editStateService.addEdit(new AddEnumEntry(entry));
    this.entriesSubject.next(this.enum().values);
  }

  onEntryUpdated(edit: EditAction) {
    this.editStateService.addEdit(edit);
    this.entriesSubject.next(this.enum().values);
  }

  onChangeType(type: 'string' | 'int') {
    this.editStateService.addEdit(
      new ChangeEnumType(this.enum().enumType, type),
    );
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
      new UpdateEntityMetadata(this.enum().metadata, metadata),
    );
    this.metadataVisible.set(false);
  }
}
