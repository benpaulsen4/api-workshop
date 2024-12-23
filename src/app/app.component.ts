import { Component, OnInit, signal } from '@angular/core';

import { EntityPanelComponent } from './components/entity-panel/entity-panel.component';
import { v7 } from 'uuid';
import { DataCollections, DataService } from './services/data.service';
import { from, Observable } from 'rxjs';
import { NamedEntity } from './models/named-entity';
import { Schema } from './models/schema';
import { SchemaEditorComponent } from './components/schema-editor/schema-editor.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [EntityPanelComponent, SchemaEditorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  items!: Observable<NamedEntity[]>;

  readonly selectedItem = signal<string | undefined>(undefined);
  readonly loading = signal(true);

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    from(this.dataService.initializeDatabase()).subscribe(() => {
      this.loading.set(false);
      this.items = this.dataService
        .getCollection(DataCollections.Schemas)
        .find().$;
    });
  }

  onCreate(name: string) {
    const item: Schema = {
      id: v7(),
      name,
      created: Date.now(),
      modified: Date.now(),
      properties: [],
    };
    this.dataService.getCollection(DataCollections.Schemas)?.insert(item);
    this.selectedItem.set(item.id);
  }

  onSelect(id: string) {
    this.selectedItem.set(id);
  }

  async onDelete(id: string) {
    await this.dataService
      .getCollection(DataCollections.Schemas)
      ?.findOne({ selector: { id: { $eq: id } } })
      .remove();
    this.selectedItem.update((item) => (item === id ? undefined : item));
  }
}
