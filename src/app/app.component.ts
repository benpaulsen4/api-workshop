import { Component, OnInit, signal } from '@angular/core';
import { EntityPanelComponent } from './components/entity-panel/entity-panel.component';
import { DataCollections, DataService } from './services/data.service';
import { from } from 'rxjs';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { RouterOutlet } from '@angular/router';
import { ImportComponent } from './components/import/import.component';
import { SearchComponent } from './components/search/search.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    EntityPanelComponent,
    Toast,
    RouterOutlet,
    ImportComponent,
    SearchComponent,
  ],
  providers: [MessageService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  dataCollections = DataCollections;

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    from(this.dataService.initializeDatabase()).subscribe({
      complete: () => {
        this.loading.set(false);
      },
      error: error => {
        this.loading.set(false);
        this.error.set(error.message ?? error);
      },
    });
  }
}
