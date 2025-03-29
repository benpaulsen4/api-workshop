import { Routes } from '@angular/router';
import { SchemaEditorComponent } from './components/schema-editor/schema-editor.component';
import { EnumEditorComponent } from './components/enum-editor/enum-editor.component';

export const routes: Routes = [
  {
    path: 'schemas/:schemaId',
    component: SchemaEditorComponent,
  },
  {
    path: 'enums/:enumId',
    component: EnumEditorComponent,
  },
];
