import {
  Component,
  Injector,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { Button } from 'primeng/button';
import { Panel } from 'primeng/panel';
import { Tooltip } from 'primeng/tooltip';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { Popover } from 'primeng/popover';
import { InputGroup } from 'primeng/inputgroup';
import { InputText } from 'primeng/inputtext';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomValidators } from '../../utilities/custom-validators';
import { map, Observable } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { instantiateNamedEntity, NamedEntity } from '../../models/named-entity';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DataCollections, DataService } from '../../services/data.service';
import { RxCollection } from 'rxdb';

@Component({
  selector: 'app-entity-panel',
  standalone: true,
  imports: [
    Panel,
    Button,
    Tooltip,
    Menu,
    Popover,
    InputGroup,
    InputText,
    ReactiveFormsModule,
    AsyncPipe,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './entity-panel.component.html',
  styleUrl: './entity-panel.component.scss',
  host: {
    '(window:resize)': 'onResize()',
  },
})
export class EntityPanelComponent implements OnInit {
  readonly entity = input.required<DataCollections>();

  readonly panel = viewChild(Panel);

  readonly actionMenuItems: MenuItem[] = [
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      command: async () => {
        // TODO prevent deletes when the entity is referenced elsewhere
        if (this.router.url.includes(this.activeMenuItemId()!)) {
          await this.router.navigate(['']);
        }
        await this.collection
          .findOne({ selector: { id: { $eq: this.activeMenuItemId() } } })
          .remove();
      },
    },
  ];

  readonly activeMenuItemId = signal<string | undefined>(undefined);
  readonly maxItems = signal(3);

  nameControl!: FormControl<string | null>;
  collection!: RxCollection;
  items$!: Observable<NamedEntity[]>;
  count$!: Observable<number>;

  constructor(
    private injector: Injector,
    private router: Router,
    private dataService: DataService,
  ) {}

  ngOnInit(): void {
    this.maxItems.set(this.calcMaxItems());
    this.collection = this.dataService.getCollection(this.entity());
    this.items$ = this.collection.find({
      limit: this.maxItems(),
      sort: [{ modified: 'desc' }],
    }).$;
    this.count$ = this.collection.count().$;

    this.nameControl = new FormControl<string>('', [
      Validators.required,
      Validators.maxLength(100),
      CustomValidators.noDuplicates(
        toSignal(
          this.collection.find().$.pipe(map(items => items.map(i => i.name))),
          {
            injector: this.injector,
          },
        ),
      ),
    ]);
  }

  onOpenActionMenu(itemId: string, menu: Menu, event: Event) {
    this.activeMenuItemId.set(itemId);
    menu.toggle(event);
    event.stopPropagation();
    event.preventDefault();
  }

  onCreate(popover: Popover) {
    if (!this.nameControl.valid) return;
    const entity = instantiateNamedEntity(
      this.entity(),
      this.nameControl.value!,
    );

    this.collection.insert(entity);
    popover.hide();
    this.nameControl.reset();

    this.router.navigate([this.entity(), entity.id]);
  }

  onResize() {
    this.maxItems.set(this.calcMaxItems());
    this.items$ = this.collection.find({
      limit: this.maxItems(),
      sort: [{ modified: 'desc' }],
    }).$;
  }

  calcMaxItems() {
    const maxHeightOfNavItems = window.innerHeight - 43 - 12 - 48; //window minus import button and gaps
    const maxHeightOfPanel = maxHeightOfNavItems / 2; //2 panels
    const maxHeightOfItems = maxHeightOfPanel - (46 + 12 + 14); //panel minus header, counter, and gaps
    const maxItems = Math.floor(maxHeightOfItems / 34); //34px is the height of each item
    return Math.max(maxItems, 3); //always display at least 3 items
  }
}
