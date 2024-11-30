import {
  Component,
  computed,
  input,
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
import {
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CustomValidators } from '../../utilities/custom-validators';

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
  ],
  templateUrl: './entity-panel.component.html',
  styleUrl: './entity-panel.component.scss',
})
export class EntityPanelComponent {
  readonly entityName = input<string>();
  readonly items = input<IEntityPanelItem[]>();
  readonly selectedItem = input<string | undefined>();

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

  readonly nameControl = new FormControl<string>('', [
    Validators.required,
    Validators.maxLength(100),
    CustomValidators.noDuplicates(
      computed(() => this.items()?.map((i) => i.name)),
    ),
  ]);
  readonly activeMenuItemId = signal<string | undefined>(undefined);

  onOpenActionMenu(itemId: string, menu: Menu, event: Event) {
    this.activeMenuItemId.set(itemId);
    menu.toggle(event);
    event.stopPropagation();
  }

  onCreate(popover: Popover) {
    if (!this.nameControl.valid) return;

    this.create.emit(this.nameControl.value!);
    popover.hide();
    this.nameControl.setValue('');
    this.nameControl.markAsPristine();
  }
}

export interface IEntityPanelItem {
  id: string;
  name: string;
}
