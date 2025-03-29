import { Component, OnInit, signal } from '@angular/core';
import { EntityPanelComponent } from './components/entity-panel/entity-panel.component';
import { v7 } from 'uuid';
import { DataCollections, DataService } from './services/data.service';
import { from, Observable } from 'rxjs';
import { NamedEntity } from './models/named-entity';
import { Schema } from './models/schema';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Router, RouterOutlet } from '@angular/router';
import { Enum } from './models/enum';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [EntityPanelComponent, Toast, RouterOutlet],
  providers: [MessageService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  schemas!: Observable<NamedEntity[]>;
  enums!: Observable<NamedEntity[]>;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor(
    private dataService: DataService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    from(this.dataService.initializeDatabase()).subscribe({
      complete: () => {
        this.loading.set(false);
        this.schemas = this.dataService
          .getCollection(DataCollections.Schemas)
          .find().$;

        this.enums = this.dataService
          .getCollection(DataCollections.Enums)
          .find().$;
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(error.message ?? error);
      },
    });
  }

  async onCreateSchema(name: string) {
    const item: Schema = {
      id: v7(),
      name,
      created: Date.now(),
      modified: Date.now(),
      properties: [],
    };
    this.dataService.getCollection(DataCollections.Schemas).insert(item);
    await this.router.navigate(['schemas', item.id]);
  }

  async onCreateEnum(name: string) {
    const item: Enum = {
      id: v7(),
      name,
      created: Date.now(),
      modified: Date.now(),
      enumType: 'string',
      values: [],
    };
    this.dataService.getCollection(DataCollections.Enums).insert(item);
    await this.router.navigate(['enums', item.id]);
  }

  async onSelectSchema(id: string) {
    await this.router.navigate(['schemas', id]);
  }

  async onSelectEnum(id: string) {
    await this.router.navigate(['enums', id]);
  }
  // TODO prevent deletes when the entity is referenced elsewhere
  async onDeleteSchema(id: string) {
    if (this.router.url.includes(id)) {
      await this.router.navigate(['']);
    }

    await this.dataService
      .getCollection(DataCollections.Schemas)
      .findOne({ selector: { id: { $eq: id } } })
      .remove();
  }
  // TODO prevent deletes when the entity is referenced elsewhere
  async onDeleteEnum(id: string) {
    if (this.router.url.includes(id)) {
      await this.router.navigate(['']);
    }

    await this.dataService
      .getCollection(DataCollections.Enums)
      .findOne({ selector: { id: { $eq: id } } })
      .remove();
  }
}
