import {
  Component,
  computed,
  effect,
  ElementRef,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { DataCollections, DataService } from '../../services/data.service';
import { Schema } from '../../models/schema';
import { Enum } from '../../models/enum';
import { FormsModule } from '@angular/forms';
import { PluralPipe } from '../../pipes/plural.pipe';
import { timer } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Button } from 'primeng/button';

@Component({
  selector: 'app-search',
  imports: [Dialog, FormsModule, PluralPipe, RouterLink, DatePipe, Button],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  host: {
    '(keydown.esc)': 'onEscape()',
    '(window:keydown.control.k)': 'onOpen($event)',
    '(keydown.arrowdown)': 'onArrowDown($event)',
    '(keydown.arrowup)': 'onArrowUp($event)',
    '(keydown.enter)': 'onEnter($event)',
  },
})
export class SearchComponent {
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchField');

  readonly visible = model(false);
  readonly searchTerm = model('');

  readonly selectedIndex = signal(-1);
  readonly schemaResults = signal<Schema[]>([]);
  readonly enumResults = signal<Enum[]>([]);
  readonly showTip = signal(false);

  readonly hasResults = computed(
    () => this.schemaResults().length > 0 || this.enumResults().length > 0,
  );
  readonly totalResults = computed(
    () => this.schemaResults().length + this.enumResults().length,
  );

  readonly search = effect(() => {
    if (!this.searchTerm()) {
      this.schemaResults.set([]);
      this.enumResults.set([]);
      this.selectedIndex.set(-1);
      return;
    }

    this.dataService
      .getCollection(DataCollections.Schemas)
      .find({
        selector: {
          nameLower: { $regex: `.*${this.searchTerm().toLowerCase()}.*` },
        },
        limit: 10,
      })
      .exec()
      .then(results => this.schemaResults.set(results));

    this.dataService
      .getCollection(DataCollections.Enums)
      .find({
        selector: {
          nameLower: { $regex: `.*${this.searchTerm().toLowerCase()}.*` },
        },
        limit: 10,
      })
      .exec()
      .then(results => this.enumResults.set(results));

    this.selectedIndex.set(0);
  });

  constructor(
    private dataService: DataService,
    private router: Router,
  ) {}

  onOpen(event?: KeyboardEvent) {
    if (!event) {
      this.showTip.set(true);
    } else {
      this.showTip.set(false);
    }

    this.visible.set(true);
    timer(100).subscribe(() => {
      const inputElement = this.searchInput()?.nativeElement;
      if (inputElement) {
        inputElement.focus();
        inputElement.select(); // Select all text in the input field
      }
    });
    event?.preventDefault();
  }

  onEscape() {
    this.visible.set(false);
  }

  onArrowDown(event: KeyboardEvent) {
    if (!this.visible() || !this.hasResults()) return;

    event.preventDefault();
    const totalResults = this.totalResults();
    const currentIndex = this.selectedIndex();

    if (currentIndex < totalResults - 1) {
      this.selectedIndex.set(currentIndex + 1);
    } else {
      this.selectedIndex.set(0); // Loop back to the first item
    }
  }

  onArrowUp(event: KeyboardEvent) {
    if (!this.visible() || !this.hasResults()) return;

    event.preventDefault();
    const totalResults = this.totalResults();
    const currentIndex = this.selectedIndex();

    if (currentIndex > 0) {
      this.selectedIndex.set(currentIndex - 1);
    } else {
      this.selectedIndex.set(totalResults - 1); // Loop to the last item
    }
  }

  onEnter(event: KeyboardEvent) {
    if (!this.visible() || !this.hasResults() || this.selectedIndex() === -1)
      return;

    event.preventDefault();
    this.selectCurrentItem();
  }

  getItemAtIndex(index: number): Schema | Enum | null {
    if (index < 0) return null;

    const schemaCount = this.schemaResults().length;

    if (index < schemaCount) {
      return this.schemaResults()[index];
    } else if (index < schemaCount + this.enumResults().length) {
      return this.enumResults()[index - schemaCount];
    }

    return null;
  }

  isItemSelected(type: 'schema' | 'enum', index: number): boolean {
    if (this.selectedIndex() === -1) return false;

    const schemaCount = this.schemaResults().length;

    if (type === 'schema') {
      return this.selectedIndex() === index;
    } else {
      // enum
      return this.selectedIndex() === schemaCount + index;
    }
  }

  selectCurrentItem() {
    const item = this.getItemAtIndex(this.selectedIndex());
    if (item) {
      const entityPath = (item as Schema)?.properties ? 'schemas' : 'enums';
      this.router.navigate([entityPath, item.id]);
      this.visible.set(false);
    }
  }
}
