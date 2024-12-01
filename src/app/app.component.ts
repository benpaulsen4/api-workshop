import { Component, OnInit, signal } from '@angular/core';

import { EntityPanelComponent } from './components/entity-panel/entity-panel.component';
import { v7 } from 'uuid';
import { DataCollections, DataService } from './services/data.service';
import { firstValueFrom, from, Observable } from 'rxjs';
import { NamedEntity } from './models/named-entity';
import { Schema } from './models/schema';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [EntityPanelComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  items!: Observable<NamedEntity[]>;
  selectedItem?: string;
  readonly loading = signal(true);

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    from(this.dataService.initializeDatabase()).subscribe(() => {
      this.loading.set(false);
      this.items = this.dataService
        .getCollection(DataCollections.Schemas)
        .find().$;
    });
    this.dataService.getCollection(DataCollections.Schemas);
  }

  onCreate(name: string) {
    const item: Schema = {
      id: v7(),
      name,
      created: Date.now(),
      modified: Date.now(),
    };
    this.dataService.getCollection(DataCollections.Schemas)?.insert(item);
    this.selectedItem = item.id;
  }

  onSelect(id: string) {
    this.selectedItem = id;
  }

  async onDelete(id: string) {
    this.dataService
      .getCollection(DataCollections.Schemas)
      ?.findOne({ selector: { id: { $eq: id } } })
      .remove();
    if (this.selectedItem == id)
      this.selectedItem = (await firstValueFrom(this.items!))[0].id;
  }
}
