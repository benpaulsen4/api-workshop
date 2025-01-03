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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [EntityPanelComponent, Toast, RouterOutlet],
  providers: [MessageService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  items!: Observable<NamedEntity[]>;

  readonly loading = signal(true);

  constructor(
    private dataService: DataService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    from(this.dataService.initializeDatabase()).subscribe(() => {
      this.loading.set(false);
      this.items = this.dataService
        .getCollection(DataCollections.Schemas)
        .find().$;
    });
  }

  async onCreate(name: string) {
    const item: Schema = {
      id: v7(),
      name,
      created: Date.now(),
      modified: Date.now(),
      properties: [],
    };
    this.dataService.getCollection(DataCollections.Schemas)?.insert(item);
    await this.router.navigate(['schemas', item.id]);
  }

  async onSelect(id: string) {
    await this.router.navigate(['schemas', id]);
  }

  async onDelete(id: string) {
    if (this.router.url.includes(id)) {
      await this.router.navigate([]);
    }

    await this.dataService
      .getCollection(DataCollections.Schemas)
      ?.findOne({ selector: { id: { $eq: id } } })
      .remove();
  }
}
