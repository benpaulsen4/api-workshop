import {
  Component,
  DestroyRef,
  Injector,
  input,
  OnInit,
  output,
  signal,
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
import { map, Observable, Subject, takeUntil } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { NamedEntity } from '../../models/named-entity';
import { NavigationEnd, Router } from '@angular/router';

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
  ],
  templateUrl: './entity-panel.component.html',
  styleUrl: './entity-panel.component.scss',
})
export class EntityPanelComponent implements OnInit {
  readonly entityName = input<string>();
  readonly items = input<Observable<NamedEntity[]>>();

  readonly create = output<string>();
  readonly itemClick = output<string>();
  readonly delete = output<string>();

  readonly actionMenuItems: MenuItem[] = [
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      command: () => {
        this.delete.emit(this.activeMenuItemId()!);
      },
    },
  ];

  nameControl!: FormControl<string | null>;
  readonly activeMenuItemId = signal<string | undefined>(undefined);
  readonly selectedItem = signal<string | undefined>(undefined);
  readonly resetNavSubscription = new Subject<void>();

  constructor(
    private injector: Injector,
    private router: Router,
    private destroyRef: DestroyRef,
  ) {}

  ngOnInit(): void {
    this.nameControl = new FormControl<string>('', [
      Validators.required,
      Validators.maxLength(100),
      CustomValidators.noDuplicates(
        toSignal(this.items()!.pipe(map((items) => items.map((i) => i.name))), {
          injector: this.injector,
        }),
      ),
    ]);

    //HACK pretty hacky method of determining selected item
    this.router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (!(event instanceof NavigationEnd)) return;

        this.resetNavSubscription.next();

        this.subscribeToNavChanges();
      });

    this.subscribeToNavChanges();
  }

  onOpenActionMenu(itemId: string, menu: Menu, event: Event) {
    this.activeMenuItemId.set(itemId);
    menu.toggle(event);
    event.stopPropagation();
  }

  onCreate(popover: Popover) {
    if (!this.nameControl.valid) return;

    this.create.emit(this.nameControl.value!);
    popover.hide();
    this.nameControl.reset();
  }

  private subscribeToNavChanges() {
    this.router.routerState.root.firstChild?.params
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        takeUntil(this.resetNavSubscription),
      )
      .subscribe((params) => {
        const idMatch = Object.entries(params).filter(
          (p) => p[0].toLowerCase().includes('id') && !!p[1],
        )[0];

        if (idMatch) {
          this.selectedItem.set(idMatch[1]);
        }
      });
  }
}
