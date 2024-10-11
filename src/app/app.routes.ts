import { Routes } from '@angular/router';
import {ActivityEditorComponent} from "./activity-editor/activity-editor.component";
import {RemoteBrowserComponent} from "./remote-browser/remote-browser.component";
import {ReplaceEntityComponent} from "./replace-entity/replace-entity.component";
import {IntegrationsComponent} from "./integrations/integrations.component";
import {ActivitySyncComponent} from "./activity-sync/activity-sync.component";
import {ActiveEntitiesComponent} from "./active-entities/active-entities.component";
import {PagesComponent} from "./pages/pages.component";

export const routes: Routes = [
  { path: 'home', component: RemoteBrowserComponent },
  { path: '',   redirectTo: '/home', pathMatch: 'full'},
  { path: 'activity/edit/:id', component: ActivityEditorComponent},
  { path: 'activity/edit', component: ActivityEditorComponent},
  { path: 'activity/clone/:id', component: ActivityEditorComponent},
  { path: 'entity/rename', component: ReplaceEntityComponent},
  { path: 'integrations', component: IntegrationsComponent},
  { path: 'activities/sync', component: ActivitySyncComponent},
  { path: 'play', component: ActiveEntitiesComponent},
  { path: 'pages/edit', component: PagesComponent},
];
