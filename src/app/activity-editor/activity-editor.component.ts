import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild} from '@angular/core';
import {MenuItem, MessageService, SharedModule} from "primeng/api";
import {ServerService} from "../server.service";
import {ActivatedRoute} from "@angular/router";
import {DropdownModule} from "primeng/dropdown";
import {MenubarModule} from "primeng/menubar";
import {NgForOf, NgIf} from "@angular/common";
import {ProgressBarModule} from "primeng/progressbar";
import {ProgressSpinnerModule} from "primeng/progressspinner";
import {ToastModule} from "primeng/toast";
import {FormsModule} from "@angular/forms";
import {Activity, Config, Context, Entity, Remote, RemoteMap} from "../interfaces";
import {ActivityViewerComponent} from "../activity-viewer/activity-viewer.component";
import {NgxJsonViewerModule} from "ngx-json-viewer";

@Component({
  selector: 'app-activity-editor',
  standalone: true,
  imports: [
    DropdownModule,
    MenubarModule,
    NgIf,
    ProgressBarModule,
    ProgressSpinnerModule,
    SharedModule,
    ToastModule,
    FormsModule,
    ActivityViewerComponent,
    NgForOf,
    NgxJsonViewerModule
  ],
  templateUrl: './activity-editor.component.html',
  styleUrl: './activity-editor.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityEditorComponent implements OnInit {
  buttonsMap:{ [id: string]: string } = {};
  activity_id = "";
  config: Config | undefined;
  remotes: Remote[] = [];
  selectedRemote: Remote | undefined;
  progress = false;
  remoteProgress = 0;
  progressDetail = "";
  items: MenuItem[] = [
    {label: 'Home', routerLink: '/home', icon: 'pi pi-home'},
    {label: 'View activity', command: () => this.activityViewser?.view(), icon: 'pi pi-folder-open'},
  ]
  activity_list: Activity[] = [];
  entity_list: Entity[] = [];
  templates: RemoteMap[] = [];
  activity: Activity | undefined;
  updatedActivity: Activity | undefined;
  protected readonly Math = Math;
  addDisabledButtons = false;
  dump: any;

  @ViewChild(ActivityViewerComponent) activityViewser: ActivityViewerComponent | undefined;
  selectedEntity: Entity | undefined;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService,
              private activatedRoute: ActivatedRoute) {

  }

  ngOnInit(): void {
    this.activatedRoute.params.subscribe(params => {
      this.activity_id = params['id'];
      this.updateActivity();
      this.cdr.detectChanges();
    })

    this.server.getPictureRemoteMap().subscribe(butonsMap => {
      this.buttonsMap = butonsMap;
      this.cdr.detectChanges();
    })

    this.server.getConfig().subscribe(config => {
      this.updateRemote(config);
      this.server.config$.subscribe(config => {
        this.updateRemote(config);
      })
    })
    this.server.getTemplateRemoteMap().subscribe(templates => {
      this.templates = templates;
      this.updateActivity();
      this.cdr.detectChanges();
    })
    const entities = localStorage.getItem("entities");
    const activities = localStorage.getItem("activities");
    if (entities || activities)
    {
      if (activities) this.activity_list = JSON.parse(activities);
      if (entities) this.entity_list = JSON.parse(entities);
      this.server.entities = this.entity_list;
      this.server.activities = this.activity_list;
      // this.context = {source:"Cache", type: "Remote", date: new Date()};
      // this.messageService.add({severity: "info", summary: `Remote data loaded from cache`});
      this.updateActivity();
      this.cdr.detectChanges();
    }
  }

  updateActivity()
  {
    if (!this.activity_id || !this.activity_list) return;
    this.activity = this.activity_list.find(activity => activity.activity_id === this.activity_id);
    if (this.activity)
    {
      this.updatedActivity = {name: this.activity.name, entities: [],
        buttons: [], sequences: [], interface:[],
        options: {//activity_group: this.activity.options?.activity_group, sequences: this.activity.options?.sequences,
          //included_entities: this.activity.options?.included_entities,
          button_mapping: [],
          user_interface: {pages: []}}};
    }

  }

  loadTemplate()
  {
    if (!this.selectedEntity || !this.activity) return;
    const template = this.templates.find(template => template.entity_type === this.selectedEntity?.entity_type!);
    const entity = this.entity_list.find(entity => entity.entity_id === this.selectedEntity?.entity_id);
    if (!entity)
    {
      this.messageService.add({severity: "error", summary: `This entity ${this.selectedEntity.name} (${this.selectedEntity.entity_id}) is not referenced`})
      this.cdr.detectChanges();
      return;
    }
    console.log("Apply template to entity", entity, template)
    if (!template) return;
    template.buttons?.forEach(button => {
      const existing_assignment = this.updatedActivity?.options?.button_mapping?.find(existing_button =>
        existing_button.button === button.button
        && ((existing_button.long_press && button.long_press === true) || existing_button.short_press));
      if (!entity.features?.includes(button.feature)) return;
      if (button.disabled === true && !this.addDisabledButtons) return;
      if (existing_assignment)
      {
       console.debug("Button already assigned", button.button, button.long_press);
       return;
      }
      if (!this.updatedActivity?.options) this.updatedActivity!.options = {};
      if (!this.updatedActivity?.options?.button_mapping) this.updatedActivity!.options!.button_mapping = [];
      let targetButton = this.updatedActivity?.options?.button_mapping.find(existing_button => existing_button.button === button.button);
      if (!targetButton) {
        targetButton = {button: button.button};
        this.updatedActivity?.options?.button_mapping?.push(targetButton);
      }
      if (button.long_press)
        targetButton!.long_press = {entity_id: this.selectedEntity?.entity_id!, cmd_id: button.cmd_id, params: button.params};
      else
        targetButton!.short_press = {entity_id: this.selectedEntity?.entity_id!, cmd_id: button.cmd_id, params: button.params};
    })
    this.dump = this.updatedActivity as any;//JSON.stringify(this.updatedActivity, null, 2);
    this.cdr.detectChanges();
  }

  updateRemote(config: Config): void
  {
    this.config = config;
    this.remotes = config.remotes!;
    const selectedRemoteAddress = localStorage.getItem('remote');
    if (selectedRemoteAddress)
    {
      this.selectedRemote = this.remotes.find(remote => remote.address === selectedRemoteAddress)
    }
    this.cdr.detectChanges();
  }

  setRemote(remote: Remote): void
  {
    localStorage.setItem('remote', remote.address);
    this.server.remote$.next(remote);
  }

  getEntities(entity_type: string) {
    return this.entity_list.filter(entity => entity.entity_type === entity_type)
      .sort((a,b) => a.name!?.localeCompare(b.name!));
  }
}
