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
import {Activity, ActivityPage, ActivityPageCommand, Config, Context, Entity, Remote, RemoteMap} from "../interfaces";
import {ActivityViewerComponent} from "../activity-viewer/activity-viewer.component";
import {NgxJsonViewerModule} from "ngx-json-viewer";
import {MultiSelectModule} from "primeng/multiselect";
import {CheckboxModule} from "primeng/checkbox";
import {ButtonModule} from "primeng/button";


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
    NgxJsonViewerModule,
    MultiSelectModule,
    CheckboxModule,
    ButtonModule
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
    {label: 'Reset mapping', command: () => this.updateActivity(), icon: 'pi pi-times'},
  ]
  activity_list: Activity[] = [];
  entity_list: Entity[] = [];
  templates: RemoteMap[] = [];
  activity: Activity | undefined;
  updatedActivity: Activity | undefined;
  protected readonly Math = Math;
  availableFeatures : {label: string, value: string}[] = [];
  selectedFeatures : {label: string, value: string}[] = [];
  overwriteAssignedButtons = false;
  keepDefinedPositions = false;
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

  applyTemplate(updatedActivity: Activity)
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
    const selectedFeatures = this.selectedFeatures.map(item => item.value);
    console.log("Selected features to map : ", selectedFeatures);
    template.buttons?.forEach(button => {
      const existing_assignment = updatedActivity?.options?.button_mapping?.find(existing_button =>
        existing_button.button === button.button
        && ((existing_button.long_press && button.long_press === true) || existing_button.short_press));
      if (!selectedFeatures.includes(button.feature)) return;
      if (!entity.features?.includes(button.feature))
      {
        console.log("Feature unavailable for this entity", button.feature);
        return;
      }

      if (existing_assignment && !this.overwriteAssignedButtons)
      {
        console.debug("Button already assigned, override not selected : skip", button.button, button.long_press);
        return;
      }
      if (!updatedActivity?.options) updatedActivity!.options = {};
      if (!updatedActivity?.options?.button_mapping) updatedActivity!.options!.button_mapping = [];
      let targetButton = updatedActivity?.options?.button_mapping.find(existing_button => existing_button.button === button.button);
      if (!targetButton) {
        targetButton = {button: button.button};
        updatedActivity?.options?.button_mapping?.push(targetButton);
      }
      if (button.long_press)
        targetButton!.long_press = {entity_id: this.selectedEntity?.entity_id!, cmd_id: button.cmd_id, params: button.params};
      else
        targetButton!.short_press = {entity_id: this.selectedEntity?.entity_id!, cmd_id: button.cmd_id, params: button.params};
    })

    template.user_interface?.pages?.forEach(page => {
      if (!updatedActivity?.options) updatedActivity!.options = {};
      if (!updatedActivity?.options?.user_interface) updatedActivity!.options.user_interface = {pages: []};
      if (page.features)
      {
        let skip = false;
        page.features.forEach(feature => {
          if (!selectedFeatures.includes(feature))
            skip = true;
          return;
        })
        if (skip)
        {
          console.debug("Interface skipped as features not matched or unselected", page);
          return;
        }
      }
      let targetPage: ActivityPage = {name: `Page ${updatedActivity!.options.user_interface.pages!.length+1}`,
        grid: {...page.grid}, items: []};
      if (page.name) targetPage.name = page.name;
      updatedActivity!.options.user_interface.pages!.push(targetPage);
      page.items.forEach(item => {
        if (item.feature && !selectedFeatures.includes(item.feature)) return;
        let location = this.getItemLocation(targetPage, item.size, item.location);
        if (location == null)
        {
          targetPage = {name: `Page ${updatedActivity!.options!.user_interface!.pages!.length+1}`,
            grid: {...page.grid}, items: []};
          location = this.getItemLocation(targetPage, item.size, item.location);
          if (location == null)
          {
            console.error("Location not found for item", item, location);
            return;
          }
          updatedActivity!.options!.user_interface!.pages!.push(targetPage);
        }
        const command: ActivityPageCommand = {entity_id: this.selectedEntity?.entity_id!,
          location, size: item.size, type: item.type, command: item.command as any};
        if (item.text) command.text = item.text;
        if (item.icon) command.icon = item.icon;
        if (item.type === "media_player") command.media_player_id = this.selectedEntity?.entity_id!;
        targetPage.items.push(command);
      })
    })
    this.dump = updatedActivity as any;//JSON.stringify(updatedActivity, null, 2);
    this.cdr.detectChanges();
  }

  getItemLocation(page: ActivityPage, size:{width:number, height:number},
                  location:{x: number, y: number} | undefined): {x: number, y: number} | null
  {
    let position = {x: 0, y: 0};
    if (location)
      position = {...location};
    while(true)
    {
      let intersection = false;
      for (let item of page.items)
      {
        if (ActivityEditorComponent.isIntersection(
          {x:position.x, y: position.y, width:size.width, height: size.height},
          {x:item.location.x, y: item.location.y, width:item.size.width, height: item.size.height}))
        {
          if (this.keepDefinedPositions)
            return null;
          intersection = true;
          position.x ++;
          if (position.x >= page.grid.width || position.x + size.width > page.grid.width)
          {
            position.x = 0; position.y ++;
          }
          if (position.y >= page.grid.height || position.y + size.height > page.grid.height)
          {
            return null;
          }
        }
      }
      if (position.x >= page.grid.width || position.x + size.width > page.grid.width)
      {
        if (this.keepDefinedPositions) return null;
        position.x = 0; position.y ++;
      }
      if (position.y >= page.grid.height || position.y + size.height > page.grid.height)
      {
        return null;
      }
      if (!intersection) return position;
    }
  }

  static isIntersection(rectangle1: {x: number, y: number, width: number, height:number},
                        rectangle2: {x: number, y: number, width: number, height:number}): boolean
  {
    return !( rectangle1.x >= (rectangle2.x + rectangle2.width) ||
      (rectangle1.x + rectangle1.width) <=  rectangle2.x ||
      rectangle1.y >= (rectangle2.y + rectangle2.height) ||
      (rectangle1.y + rectangle1.height) <=  rectangle2.y);
  }

  getTemplateFeatures(template: RemoteMap, includeDisabled = false): string[]
  {
    const features = new Set<string>();
    template.buttons?.forEach(button => {
      if (includeDisabled || button.disabled !== true)
        features.add(button.feature)
    });
    template.user_interface?.pages.forEach(page => {
      if (page.features) page.features.forEach(feature => features.add(feature));
      page.items.forEach(item => {
        if (item.feature) features.add(item.feature);
      })
    })
    return Array.from(features).sort();
  }

  loadTemplate()
  {
    const template = this.templates.find(template => template.entity_type === this.selectedEntity?.entity_type!);
    if (!template) return;
    this.availableFeatures = this.getTemplateFeatures(template, true).map(feature => {return {label: feature, value: feature}});
    this.selectedFeatures = this.getTemplateFeatures(template).map(feature => {return {label: feature, value: feature}});
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
