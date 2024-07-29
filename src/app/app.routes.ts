import { Routes } from '@angular/router';
import {ActivityEditorComponent} from "./activity-editor/activity-editor.component";
import {RemoteBrowserComponent} from "./remote-browser/remote-browser.component";
import {ReplaceEntityComponent} from "./replace-entity/replace-entity.component";

export const routes: Routes = [
  { path: 'home', component: RemoteBrowserComponent },
  { path: '',   redirectTo: '/home', pathMatch: 'full'},
  { path: 'activity/edit/:id', component: ActivityEditorComponent},
  { path: 'entity/rename', component: ReplaceEntityComponent}
];
