import { Routes } from '@angular/router';
import {ActivityEditorComponent} from "./activity-editor/activity-editor.component";
import {RemoteBrowserComponent} from "./remote-browser/remote-browser.component";
import {ReplaceEntityComponent} from "./replace-entity/replace-entity.component";
import {ActivityCopyComponent} from "./activity-copy/activity-copy.component";

export const routes: Routes = [
  { path: 'home', component: RemoteBrowserComponent },
  { path: '',   redirectTo: '/home', pathMatch: 'full'},
  { path: 'activity/edit/:id', component: ActivityEditorComponent},
  { path: 'activity/copy/:id', component: ActivityCopyComponent},
  { path: 'entity/rename', component: ReplaceEntityComponent}
];
