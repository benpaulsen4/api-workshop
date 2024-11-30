import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  EntityPanelComponent,
  IEntityPanelItem,
} from './components/entity-panel/entity-panel.component';
import { v7 } from 'uuid';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, EntityPanelComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  items: IEntityPanelItem[] = [];
  selectedItem?: string;

  onCreate(name: string) {
    const item = {
      id: v7(),
      name,
    };
    this.items.push(item);
    this.items = [...this.items];
    this.selectedItem = item.id;
  }

  onSelect(id: string) {
    this.selectedItem = id;
  }

  onDelete(id: string) {
    this.items = this.items.filter((i) => i.id !== id);
    if (this.selectedItem == id) this.selectedItem = this.items[0]?.id;
  }
}
