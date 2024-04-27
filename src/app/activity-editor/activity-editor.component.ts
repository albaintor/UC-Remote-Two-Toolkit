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
import {
  Activity,
  ActivityPageCommand,
  Command,
  Config,
  Entity,
  OperationStatus,
  Remote,
  RemoteMap,
  RemoteOperation,
  UIPage
} from "../interfaces";
import {ActivityViewerComponent} from "../activity-viewer/activity-viewer.component";
import {NgxJsonViewerModule} from "ngx-json-viewer";
import {MultiSelectModule} from "primeng/multiselect";
import {CheckboxModule} from "primeng/checkbox";
import {ButtonModule} from "primeng/button";
import {Helper} from "../helper";
import {AutoCompleteCompleteEvent, AutoCompleteModule} from "primeng/autocomplete";
import {RemoteOperationsComponent} from "./remote-operations/remote-operations.component";

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
    ButtonModule,
    AutoCompleteModule,
    RemoteOperationsComponent
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
  availableItems: MenuItem[] = [
    {label: 'Home', routerLink: '/home', icon: 'pi pi-home'},
    {label: 'View original activity', command: () => this.activityViewser?.view(this.activity!, false), icon: 'pi pi-folder-open'},
    {label: 'View new activity', command: () => this.activityViewser?.view(this.updatedActivity!, true), icon: 'pi pi-folder-open'},
    {label: 'Reset mapping to original', command: () => this.updateActivity(), icon: 'pi pi-times'},
    {label: 'Clear mapping', command: () => this.clearMapping(), icon: 'pi pi-times'},
    {label: 'Save activity to remote', command: () => this.buildUpdateData(), icon: 'pi pi-cloud-upload'},
  ]
  items: MenuItem[] = [];
  activity_list: Activity[] = [];
  entities: Entity[] = [];
  templates: RemoteMap[] = [];
  activity: Activity | undefined;
  updatedActivity: Activity | undefined;
  protected readonly Math = Math;
  availableFeatures : {label: string, value: string}[] = [];
  selectedFeatures : {label: string, value: string}[] = [];
  overwriteAssignedButtons = false;
  keepDefinedPositions = false;
  dump: any;
  remoteOperations: RemoteOperation[] = [];
  entity: Entity | undefined;
  newEntity: Entity | undefined;

  @ViewChild(ActivityViewerComponent) activityViewser: ActivityViewerComponent | undefined;
  @ViewChild(RemoteOperationsComponent) operations: RemoteOperationsComponent | undefined;

  selectedEntity: Entity | undefined;
  suggestions: Entity[] = [];

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService,
              private activatedRoute: ActivatedRoute) {

  }

  ngOnInit(): void {
    this.initMenu();
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
      if (entities) this.entities = JSON.parse(entities);
      this.server.setEntities(this.entities);
      this.server.setActivities(this.activity_list);
      // this.context = {source:"Cache", type: "Remote", date: new Date()};
      // this.messageService.add({severity: "info", summary: `Remote data loaded from cache`});
      this.updateActivity();
      this.cdr.detectChanges();
    }
  }

  initMenu()
  {
    if (this.updatedActivity)
      this.items = [...this.availableItems];
    else
      this.items = [...this.availableItems.filter(item => item.label !== 'Save activity to remote')];
  }

  buildUpdateData()
  {
    if (!this.updatedActivity) return;
    this.remoteOperations = [];
    const newIncludedEntities = Helper.getActivityEntities(this.updatedActivity!, this.entities);
    let updateIncludedEntities = false;
    let createActivity = false;
    if (!this.updatedActivity.entity_id ||
      !this.entities.find(entity => entity.entity_id === this.updatedActivity!.entity_id)) {
      this.updatedActivity!.entity_id = undefined;
      createActivity = true;
    }

    if (this.activity)
    {
      const currentIncludedEntities = Helper.getActivityEntities(this.activity!, this.entities);
      newIncludedEntities.forEach(entity => {
        if (!currentIncludedEntities.find(currentEntity => currentEntity.entity_id === entity.entity_id))
          updateIncludedEntities = true;
      });
    }
    else
      updateIncludedEntities = true;

    if (createActivity)
    {
      this.remoteOperations.push({method: "POST", api: `/api/activities`,
        body: {
          name: this.updatedActivity.name,
          options: {
            entity_ids: newIncludedEntities.map((entity) => entity.entity_id),
          }
        }, status: OperationStatus.Todo});
      this.messageService.add({severity: "info", summary: "The activity has to be created first : execute this one-task first and reload"});
      this.cdr.detectChanges();
      return;
    } else if (updateIncludedEntities)
    {
      this.remoteOperations.push({method: "PATCH", api: `/api/activities/${this.updatedActivity?.entity_id}`,
        body: {
          options: {
            entity_ids: newIncludedEntities.map((entity) => entity.entity_id),
          }
        }, status: OperationStatus.Todo})
    }


    this.updatedActivity?.options?.button_mapping?.forEach(button => {
      const originalButton = this.activity?.options?.button_mapping?.
        find(localButton=> localButton.button === button.button);
      if (!originalButton || !Helper.compareButtons(button, originalButton))
        this.remoteOperations.push({method: "PATCH", api: `/api/activities/${this.updatedActivity?.entity_id}/buttons/${button.button}`,
        body: {
          ...button
        }, status: OperationStatus.Todo})
    });
    this.updatedActivity?.options?.user_interface?.pages?.forEach(page => {
      const currentPage = this.activity?.options?.user_interface?.pages?.find(currentPage =>
        currentPage.page_id === page.page_id);
      if (currentPage && Helper.comparePages(page, currentPage)) return;
      let api = `/api/activities/${this.updatedActivity?.entity_id}/ui/pages`;
      let method: "PUT" | "POST" | "DELETE" | "PATCH" = "POST";
      if (page.page_id) {
        api = `/api/activities/${this.updatedActivity?.entity_id}/ui/pages/${page.page_id}`;
        method = "PATCH";
      }

      this.remoteOperations.push({method , api,
        body: {
          ...page
        }, status: OperationStatus.Todo})
    })
    if (this.remoteOperations.length == 0)
    {
      this.messageService.add({severity:"info", summary: "No modifications applied"});
      this.cdr.detectChanges();
      return;
    }

    this.dump = this.remoteOperations;
    this.cdr.detectChanges();
  }

  clearMapping()
  {
    this.updatedActivity!.options!.button_mapping = [];
    this.updatedActivity!.options!.user_interface!.pages = [];
    this.cdr.detectChanges();
  }

  updateActivity()
  {
    if (!this.activity_id || !this.activity_list) return;
    this.activity = this.activity_list.find(activity => activity.entity_id === this.activity_id);
    if (this.activity)
    {
      this.updatedActivity = {
        entity_id: this.activity.entity_id,
        name: this.activity.name,
        options: {//activity_group: this.activity.options?.activity_group, sequences: this.activity.options?.sequences,
          included_entities: [],
          button_mapping: [],
          user_interface: {pages: []}}};
      if (this.activity.options?.included_entities)
        this.updatedActivity.options!.included_entities = [...this.activity.options?.included_entities!];
      ['on', 'off'].forEach(type => {
        if (!this.updatedActivity!.options!.sequences)
          this.updatedActivity!.options!.sequences = {};
        if (this.activity!.options?.sequences?.[type])
        {
          this.updatedActivity!.options!.sequences![type] = [...this.activity!.options!.sequences[type]!]
        }
      });
      if (this.activity.options?.button_mapping)
        this.updatedActivity!.options!.button_mapping! = JSON.parse(JSON.stringify(this.activity.options.button_mapping));
      if (this.activity.options?.user_interface?.pages)
        this.updatedActivity!.options!.user_interface!.pages = JSON.parse(JSON.stringify(this.activity.options.user_interface.pages));
    }
    this.initMenu();
    this.cdr.detectChanges();
  }

  applyTemplate(updatedActivity: Activity)
  {
    if (!this.selectedEntity || !this.activity) return;
    const template = this.templates.find(template => template.entity_type === this.selectedEntity?.entity_type!);
    const entity = this.entities.find(entity => entity.entity_id === this.selectedEntity?.entity_id);
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
      if (button.feature && !selectedFeatures.includes(button.feature)) return;
      if (button.simple_command === true && !this.selectedEntity?.options?.simple_commands?.includes(button.cmd_id)) return;

      if (button.feature && !entity.features?.includes(button.feature))
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

      // Reuse existing page if empty and same size
      let targetPage = Helper.findExistingMatchPage(this.updatedActivity!,
        page.grid.width, page.grid.height);
      if (!targetPage) {
        targetPage = {
          name: `Page ${updatedActivity!.options.user_interface.pages!.length + 1}`,
          grid: {...page.grid}, items: []
        };
        updatedActivity!.options.user_interface.pages!.push(targetPage);
      }

      if (page.name) targetPage.name = page.name;


      page.items.forEach(item => {
        if (item.feature && !selectedFeatures.includes(item.feature)) return;
        let location = this.getItemLocation(targetPage!, item.size, item.location);
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
        const command: ActivityPageCommand = {location, size: item.size, type: item.type,
          command: {entity_id: this.selectedEntity?.entity_id!,...item.command} as any};
        if (item.text) command.text = item.text;
        if (item.icon) command.icon = item.icon;
        if (item.type === "media_player") command.media_player_id = this.selectedEntity?.entity_id!;
        targetPage!.items.push(command);
      })
    })
    this.operations!.visible = true;
    this.dump = updatedActivity as any;//JSON.stringify(updatedActivity, null, 2);
    this.cdr.detectChanges();
  }

  getItemLocation(page: UIPage,
                  size:{width:number, height:number},
                  location:({x: number, y: number} | undefined) | null)
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
          if (location && this.keepDefinedPositions)
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
      if (button.feature && (includeDisabled || button.disabled !== true))
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
    return this.entities.filter(entity => entity.entity_type === entity_type)
      .sort((a,b) => a.name!?.localeCompare(b.name!));
  }

  replaceEntity(entity_id: string, new_entity_id: string): any
  {
    const entity = this.entities.find(entity => entity.entity_id === new_entity_id);
    if (!this.updatedActivity || !entity) return;
    if (!this.updatedActivity.options?.included_entities?.find(entity => entity.entity_id === new_entity_id))
      this.updatedActivity?.options!.included_entities!.push(entity);
    this.updatedActivity?.options?.button_mapping?.forEach(button => {
      if (button.long_press?.entity_id === entity_id)
        button.long_press.entity_id = new_entity_id;
      if (button.short_press?.entity_id === entity_id)
        button.short_press.entity_id = new_entity_id;
    })
    this.updatedActivity?.options?.user_interface?.pages?.forEach(page => {
      page?.items?.forEach(item => {
        if (item.command && typeof item.command === "string" && (item.command as string) === entity_id)
          item.command = new_entity_id;
        else if (item.command && (item.command as Command)?.entity_id === entity_id)
          (item.command as Command).entity_id = new_entity_id;
        if (item.media_player_id === entity_id)
          item.media_player_id = new_entity_id;
      })
    });
    ['on', 'off'].forEach(type => {
      this.updatedActivity?.options?.sequences?.[type]?.forEach(sequence => {
        if (sequence.command?.entity_id === entity_id)
          sequence.command!.entity_id = new_entity_id;
      })
    })
    this.messageService.add({severity: "success", summary: "Entity replaced"});
    this.dump = this.updatedActivity as any;//JSON.stringify(updatedActivity, null, 2);
    this.cdr.detectChanges();
  }

  protected readonly Helper = Helper;

  searchEntity($event: AutoCompleteCompleteEvent) {
    if (!$event.query || $event.query.length == 0)
    {
      console.log("Search entity : whole list");
      this.suggestions = [...this.entities.sort((a, b) => {
        return (a.name ? a.name : "").localeCompare(b.name ? b.name : "");
      })];
      this.cdr.detectChanges();
      return;
    }
    this.suggestions = Helper.queryEntity($event.query, this.entities);
    this.cdr.detectChanges();
  }

  searchActivityEntity($event: AutoCompleteCompleteEvent) {
    if (!this.updatedActivity?.options?.included_entities) return;
    if (!$event.query || $event.query.length == 0)
    {
      console.log("Search entity : whole list");
      const activityEntities = this.entities.filter(entity =>
        this.updatedActivity?.options?.included_entities?.find(activityEntity => activityEntity.entity_id === entity.entity_id));
      this.suggestions = activityEntities.sort((a, b) => {
        return (a.name ? a.name : "").localeCompare(b.name ? b.name : "");
      });
      this.cdr.detectChanges();
      return;
    }
    this.suggestions = Helper.queryEntity($event.query, [...this.updatedActivity!.options!.included_entities!]);
    this.cdr.detectChanges();
  }
}
