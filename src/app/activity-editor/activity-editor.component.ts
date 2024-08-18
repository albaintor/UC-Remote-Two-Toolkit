import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {ConfirmationService, MenuItem, MessageService, SharedModule} from "primeng/api";
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
  RemoteOperationResultField,
  UIPage
} from "../interfaces";
import {ActivityViewerComponent} from "../activity-viewer/activity-viewer.component";
import {NgxJsonViewerModule} from "ngx-json-viewer";
import {MultiSelectModule} from "primeng/multiselect";
import {CheckboxModule} from "primeng/checkbox";
import {ButtonModule} from "primeng/button";
import {Helper} from "../helper";
import {AutoCompleteCompleteEvent, AutoCompleteModule} from "primeng/autocomplete";
import {RemoteOperationsComponent} from "../remote-operations/remote-operations.component";
import {MessagesModule} from "primeng/messages";
import {DialogModule} from "primeng/dialog";
import {saveAs} from "file-saver-es";
import {map, Observable} from "rxjs";
import {RemoteData, RemoteDataLoaderComponent} from "../remote-data-loader/remote-data-loader.component";
import {ChipModule} from "primeng/chip";
import {InputTextModule} from "primeng/inputtext";
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {BlockUIModule} from "primeng/blockui";

export const NEW_ACTIVITY_ID_KEY = "<ACTIVITY_ID>";

enum OperationMode {
  Undefined,
  ReplaceMode,
  CreateMode
}

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
    RemoteOperationsComponent,
    MessagesModule,
    DialogModule,
    RemoteDataLoaderComponent,
    ChipModule,
    InputTextModule,
    ConfirmDialogModule,
    BlockUIModule
  ],
  templateUrl: './activity-editor.component.html',
  styleUrl: './activity-editor.component.css',
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ActivityEditorComponent implements OnInit, AfterViewInit {
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
    {label: 'View original activity', command: () => this.viewerVisible = true, icon: 'pi pi-folder-open'},
    {label: 'Reset mapping to original', command: () => this.resetActivity(), icon: 'pi pi-times'},
    {label: 'Clear mapping', command: () => this.clearMapping(), icon: 'pi pi-times'},
    {label: 'Save activity to remote', command: () => this.buildDataAndShowOperations(), icon: 'pi pi-cloud-upload'},
  ]
  items: MenuItem[] = [];
  activities: Activity[] = [];
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
  protected readonly Helper = Helper;
  viewerVisible = false;
  mode: OperationMode = OperationMode.Undefined;
  showOperations = false;
  orphanEntities : {oldEntity:Entity, newEntity:Entity | undefined}[] = [];

  @ViewChild("editor") activityEditor: ActivityViewerComponent | undefined;
  @ViewChild(RemoteOperationsComponent) operations: RemoteOperationsComponent | undefined;
  @ViewChild("input_file", {static: false}) input_file: ElementRef | undefined;
  @ViewChild(RemoteDataLoaderComponent) remoteLoader: RemoteDataLoaderComponent | undefined;

  selectedEntity: Entity | undefined;
  suggestions: Entity[] = [];
  suggestions2: Entity[] = [];
  suggestions3: Entity[] = [];
  targetRemote: Remote | undefined;


  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService,
              private activatedRoute: ActivatedRoute, private confirmationService: ConfirmationService) {

  }

  ngOnInit(): void {
    this.initMenu();
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
      this.remoteOperations = this.buildData();
      this.cdr.detectChanges();
    })
    const entities = localStorage.getItem("entities");
    const activities = localStorage.getItem("activities");
    if (entities || activities)
    {
      if (activities) this.activities = JSON.parse(activities);
      if (entities) this.entities = JSON.parse(entities);
      this.server.setEntities(this.entities);
      this.server.setActivities(this.activities);
      this.remoteOperations = this.buildData();
      this.cdr.detectChanges();
    }
  }

  ngAfterViewInit(): void {
    this.activatedRoute.queryParams.subscribe(param => {
      const source = param['source'];
      if (source)
      {
        if (!this.targetRemote)
        {
          this.server.getConfig().subscribe(config => {
            this.updateRemote(config);
            this.targetRemote = this.selectedRemote;
            if (source === 'file')
              this.importActivity();
            else if (source === 'clipboard')
              this.importActivityFromClipboard();
            this.cdr.detectChanges();
          })
        }
        else
        {
          if (source === 'file')
            this.importActivity();
          else if (source === 'clipboard')
            this.importActivityFromClipboard();
          this.cdr.detectChanges();
        }
      }
    })
    this.activatedRoute.params.subscribe(params => {
      this.activity_id = params['id'];
      if (!this.activity_id) {
        return;
      }
      if (this.activatedRoute.snapshot.url.find(url => url.path === 'clone')) {
        this.mode = OperationMode.CreateMode;
        this.server.getConfig().subscribe(config => {
          this.updateRemote(config);
          this.targetRemote = this.selectedRemote;
          this.reloadAndBuildData();
        });
      } else
        this.remoteOperations = this.buildData();
      this.cdr.detectChanges();

    })
  }



  initMenu()
  {
    // if (this.updatedActivity)
    this.items = [...this.availableItems];
    //this.items = [...this.availableItems.filter(item => item.label !== 'Save activity to remote')];
  }

  //TODO delta mode
  /*buildUpdateData()
  {
    this.updatedActivity?.options?.button_mapping?.forEach(button => {
      const originalButton = this.activity?.options?.button_mapping?.
        find(localButton=> localButton.button === button.button);
      if (!originalButton || !Helper.compareButtons(button, originalButton))
        this.remoteOperations.push({name: `Button ${button.button}`,method: "PATCH", api: `/api/activities/${this.updatedActivity?.entity_id}/buttons/${button.button}`,
        body: {
          ...button
        }, status: OperationStatus.Todo})
    });
    this.updatedActivity?.options?.user_interface?.pages?.forEach(page => {
      const currentPage = this.activity?.options?.user_interface?.pages?.find(currentPage =>
        currentPage.page_id === page.page_id);
      // if (currentPage && Helper.comparePages(page, currentPage)) return;
      let api = `/api/activities/${this.updatedActivity?.entity_id}/ui/pages`;
      let method: "PUT" | "POST" | "DELETE" | "PATCH" = "POST";
      if (page.page_id) {
        api = `/api/activities/${this.updatedActivity?.entity_id}/ui/pages/${page.page_id}`;
        method = "PATCH";
      }

      this.remoteOperations.push({name: `Page ${page.name}`, method , api,
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
    else {
      this.showOperations = true;
    }

    this.dump = this.remoteOperations;
    this.cdr.detectChanges();
  }*/

  reloadAndBuildData()
  {
    this.reloadRemoteAndbuildData().subscribe({next: results => {
        this.messageService.add({severity: "success", summary: "Activity imported successfully"});
        console.log("Pending operations", this.remoteOperations);
        this.dump = this.remoteOperations;
        if (results) this.remoteOperations = results;
        if (!this.orphanEntities.find(entity => entity.newEntity == undefined))
          this.showOperations = true;
        this.cdr.detectChanges();
      }, error: error => {
        this.messageService.add({severity: "error", summary: "Failed to import activity"});
        this.cdr.detectChanges();
      }})
  }

  reloadRemoteAndbuildData(): Observable<RemoteOperation[] | undefined>
  {
    this.messageService.add({severity: "info", summary: "Loading target remote data..."});
    this.cdr.detectChanges();
    return this.remoteLoader!.loadRemoteData().pipe(map(data => {
      if (!data || !this.updatedActivity || !this.targetRemote) return [];
      this.activities = data.activities;
      this.entities = data.entities;
      this.cdr.detectChanges();
      const remoteOperations = this.buildData();
      this.checkExistingActivity();
      return remoteOperations;
    }))
  }

  checkExistingActivity()
  {
    if (this.mode != OperationMode.Undefined) return;
    if (this.activities.find(activity => activity.entity_id === this.updatedActivity?.entity_id)) {
      this.confirmationService.confirm({
        header: `Activity "${this.updatedActivity?.name}" to import already exists`,
        message: 'Do you want to replace it ?',
        acceptIcon: 'pi pi-check mr-2',
        rejectIcon: 'pi pi-times mr-2',
        rejectButtonStyleClass: 'p-button-sm',
        acceptButtonStyleClass: 'p-button-outlined p-button-sm',
        reject: () => {
          delete this.updatedActivity?.entity_id;
          this.mode = OperationMode.CreateMode;
          this.remoteOperations = this.buildData();
          this.messageService.add({ severity: 'info', summary: 'Information', detail: 'The activity will be cloned', life: 3000 });
          this.showOperations = true;
          this.cdr.detectChanges();
        },
        accept: () => {
          this.mode = OperationMode.ReplaceMode;
          // this.remoteOperations = this.buildData();
          this.messageService.add({ severity: 'info', summary: 'Information', detail: 'Activity imported will be replaced', life: 3000 });
          this.showOperations = true;
          this.cdr.detectChanges();
        }
      });
      this.cdr.detectChanges();
    }
  }

  checkIncludedEntity(entityId: string, activity: Activity)
  {
    if (activity.options?.included_entities?.find(entity => entity.entity_id === entityId)) return;
    let entity = this.entities.find(entity => entity.entity_id === entityId);
    if (!entity) entity = {entity_id: entityId} as any;
    if (!activity.options) activity.options = {included_entities: []}
    if (!activity.options.included_entities) activity.options.included_entities = [];
    activity.options.included_entities.push(entity!);
  }

  buildDataAndShowOperations()
  {
    this.remoteOperations = this.buildData();
    this.showOperations = true;
    this.cdr.detectChanges();
  }

  buildData(): RemoteOperation[]
  {
    const remoteOperations: RemoteOperation[] = [];
    if (!this.activities) return remoteOperations;
    this.orphanEntities = [];
    if (this.activity_id) this.activity = this.activities.find(activity => activity.entity_id === this.activity_id);
    if (!this.updatedActivity && this.activity)
    {
      this.updatedActivity = {
        entity_id: this.activity.entity_id,
        name: Helper.getEntityName(this.activity),
        description: this.activity.description,
        icon: this.activity.icon,
        options: {//activity_group: this.activity.options?.activity_group, sequences: this.activity.options?.sequences,
          included_entities: [],
          button_mapping: [],
          user_interface: {pages: []}}};
      if (this.activity.options?.included_entities)
        this.updatedActivity!.options!.included_entities = [...this.activity.options?.included_entities!];
      if (this.activity!.options?.sequences)
        this.updatedActivity!.options!.sequences = JSON.parse(JSON.stringify(this.activity.options.sequences));
      if (this.activity.options?.button_mapping)
        this.updatedActivity!.options!.button_mapping! = JSON.parse(JSON.stringify(this.activity.options.button_mapping));
      if (this.activity.options?.user_interface?.pages)
        this.updatedActivity!.options!.user_interface!.pages = JSON.parse(JSON.stringify(this.activity.options.user_interface.pages));
      this.activityEditor?.updateButtonsGrid();
    }

    if (!this.updatedActivity || !this.targetRemote) return remoteOperations;
    const body: any = {
      name: {
        en: Helper.getEntityName(this.updatedActivity),
      },
      options: {}
    }
    if (this.updatedActivity.icon)
      body.icon = this.updatedActivity.icon;
    if (this.updatedActivity.description)
      body.description = this.updatedActivity.description;
    if (this.updatedActivity.options?.prevent_sleep)
      body.options.prevent_sleep = this.updatedActivity.options.prevent_sleep;
    if (this.updatedActivity.options?.included_entities)
      body.options.entity_ids = this.updatedActivity!.options!.included_entities!.map((entity) => entity.entity_id);
    if (this.updatedActivity.options?.sequences)
      body.sequences = {...this.updatedActivity.options.sequences};


    // Add missing included entities
    for (let sequenceName in this.updatedActivity!.options?.sequences)
    {
      const sequences = this.updatedActivity.options!.sequences[sequenceName];
      sequences.forEach(sequence => {
        if (sequence.command?.entity_id) this.checkIncludedEntity(sequence.command!.entity_id, this.updatedActivity!);
      })
    }
    this.updatedActivity!.options?.button_mapping?.forEach(button => {
      if (!button.long_press && !button.short_press) return;
      if (button.long_press) this.checkIncludedEntity(button.long_press.entity_id, this.updatedActivity!);
      if (button.short_press) this.checkIncludedEntity(button.short_press.entity_id, this.updatedActivity!);
    });
    this.updatedActivity!.options?.user_interface?.pages?.forEach(page => {
      page.items.forEach(item => {
        if (item.media_player_id) this.checkIncludedEntity(item.media_player_id, this.updatedActivity!);
        if ((item.command as Command)?.entity_id) this.checkIncludedEntity((item.command as Command)!.entity_id, this.updatedActivity!);
      })
    });

    if (this.updatedActivity?.options?.included_entities) {
      this.orphanEntities = this.updatedActivity.options.included_entities.filter(included_entity => {
        return !this.entities.find(entity => entity.entity_id === included_entity.entity_id)}).map(entity => { return {
        oldEntity: entity, newEntity: undefined
      }});
    }

    // Create or update
    if (this.mode == OperationMode.CreateMode)
      delete this.updatedActivity?.entity_id;
    const activity = this.activities.find(activity => activity.entity_id === this.updatedActivity?.entity_id);

    let resultField: RemoteOperationResultField | undefined = undefined;
    if (activity)
    {
      console.log("Activity to import exists, we will update it", body);
      activity.options?.button_mapping?.forEach(button => {
        remoteOperations.push({name: `Delete button ${button.button} ${this.updatedActivity!.name}`,
          method: "DELETE", api: `/api/activities/${activity.entity_id}/buttons/${button.button}`,
          body: {}, status: OperationStatus.Todo});
      })
      activity.options?.user_interface?.pages?.forEach(page => {
        remoteOperations.push({name: `Delete page ${page.name} ${this.updatedActivity!.name}`,
          method: "DELETE", api: `/api/activities/${activity.entity_id}/ui/pages/${page.page_id}`,
          body: {}, status: OperationStatus.Todo});
      });
      remoteOperations.push({name: `Update activity ${this.updatedActivity!.name}`, method: "PATCH",
        api: `/api/activities/${activity.entity_id}`, body, status: OperationStatus.Todo});
    }
    else
    {
      console.log("Activity to import does not exist, we will create it", body);
      let createOperation: RemoteOperation = {name: `Create activity ${this.updatedActivity!.name}`, method: "POST", api: `/api/activities`,
        body, status: OperationStatus.Todo};
      remoteOperations.push(createOperation);
      resultField = {fieldName: "entity_id", linkedOperation: createOperation, keyName: NEW_ACTIVITY_ID_KEY};
    }

    let first = true;
    this.updatedActivity!.options?.user_interface?.pages?.forEach(page => {
      const newPage = {...page};
      delete newPage["page_id"];
      if (resultField) {
        if (first)
        {
          remoteOperations.push({
            name: `Page ${page.name}`, method: "PATCH", api:
              `/api/activities/${NEW_ACTIVITY_ID_KEY}/ui/pages/main`,
            resultFields: [resultField],
            body: {
              ...newPage
            }, status: OperationStatus.Todo
          });
          first = false;
        } else
        remoteOperations.push({
          name: `Page ${page.name}`, method: "POST", api:
            `/api/activities/${NEW_ACTIVITY_ID_KEY}/ui/pages`,
          resultFields: [resultField],
          body: {
            ...newPage
          }, status: OperationStatus.Todo
        });
      }
      else
        remoteOperations.push({name: `Page ${page.name}`, method: "POST", api:
            `/api/activities/${this.updatedActivity?.entity_id}/ui/pages`,
          body: {
            ...newPage
          }, status: OperationStatus.Todo});
    })

    this.updatedActivity!.options?.button_mapping?.forEach(button => {
      if (!button.long_press && !button.short_press) return;
      if (resultField)
        remoteOperations.push({name: `Button ${button.button}`,method: "PATCH",
          api: `/api/activities/${NEW_ACTIVITY_ID_KEY}/buttons/${button.button}`,
          resultFields: [resultField],
          body: {
            ...button
          }, status: OperationStatus.Todo})
      else
        remoteOperations.push({name: `Button ${button.button}`,method: "PATCH",
          api: `/api/activities/${this.updatedActivity?.entity_id}/buttons/${button.button}`,
          body: {
            ...button
          }, status: OperationStatus.Todo})
    });
    return remoteOperations;
  }

  clearMapping()
  {
    this.updatedActivity!.options!.button_mapping = [];
    this.updatedActivity!.options!.user_interface!.pages = [];
    this.cdr.detectChanges();
  }

  applyTemplate()
  {
    this.applyTemplateOnActivity(this.updatedActivity!);
    this.remoteOperations = this.buildData();
    this.cdr.detectChanges();
    // this.viewer.view(updatedActivity!, true)
  }

  applyTemplateOnActivity(updatedActivity: Activity)
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
        existing_button.button === button.button && (existing_button.long_press || existing_button.short_press)
        && ((existing_button.long_press && button.long_press === true) || existing_button.short_press));
      if (button.feature && !selectedFeatures.includes(button.feature)) return;
      if (button.simple_command === true && !this.selectedEntity?.options?.simple_commands?.includes(button.cmd_id)) {
        //console.log("TOTO", button.cmd_id, this.selectedEntity?.options?.simple_commands);
        return
      }

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
    console.log("BUTTONS", this.updatedActivity?.options?.button_mapping)

    template.user_interface?.pages?.forEach(page => {
      if (!updatedActivity?.options) updatedActivity!.options = {};
      if (!updatedActivity?.options?.user_interface) updatedActivity!.options.user_interface = {pages: []};
      if (page.features)
      {
        let skip = false;
        page.features.forEach(feature => {
          if (!selectedFeatures.includes(feature) || !entity.features?.includes(feature))
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
        if (item.feature && !entity.features?.includes(item.feature)) return;
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
        let command: ActivityPageCommand = {location, size: item.size, type: item.type,
          command: {entity_id: this.selectedEntity?.entity_id!,...item.command} as any};
        if (item.type === "media_player")
          command = {location, size: item.size, type: item.type, media_player_id: this.selectedEntity?.entity_id!};
        if (item.text) command.text = item.text;
        if (item.icon) command.icon = item.icon;
        targetPage!.items.push(command);
      })
    })
    this.showOperations = true;
    this.dump = updatedActivity as any;//JSON.stringify(updatedActivity, null, 2);
    this.activityEditor?.updateButtonsGrid();
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
        if (Helper.isIntersection(
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
    this.selectedRemote  = Helper.getSelectedRemote(this.remotes);
    this.targetRemote = this.selectedRemote;
    this.cdr.detectChanges();
  }

  setRemote(remote: Remote): void
  {
    Helper.setRemote(remote);
    this.server.remote$.next(remote);
  }

  remoteLoaded($event: RemoteData | undefined) {
    if ($event)
    {
      this.reset();
      this.activities = $event.activities;
      this.entities = $event.entities;
      this.activities.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.entities.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.remoteOperations = this.buildData();
      this.cdr.detectChanges();
    }
  }

  setTargetRemote(remote: Remote): void
  {
    this.cdr.detectChanges();
    console.log("Changed target remote", this.targetRemote, this.updatedActivity);
    this.remoteLoader?.load();
    this.cdr.detectChanges();
  }

  getEntities(entity_type: string) {
    return this.entities.filter(entity => entity.entity_type === entity_type)
      .sort((a,b) => Helper.getEntityName(a)!.localeCompare(Helper.getEntityName(b)!));
  }

  replaceEntity(entity_id: string, new_entity_id: string, hideMessage = false): any
  {
    const newEntity = this.entities.find(entity => entity.entity_id === new_entity_id);
    if (!this.updatedActivity || !newEntity) return;
    if (!this.updatedActivity.options?.included_entities?.find(entity => entity.entity_id === new_entity_id))
      this.updatedActivity?.options!.included_entities!.push(newEntity);

    if (this.updatedActivity.options?.included_entities?.find(entity => entity.entity_id === entity_id))
      this.updatedActivity.options.included_entities?.splice(
      this.updatedActivity.options.included_entities?.indexOf(
        this.updatedActivity.options.included_entities.find(entity => entity.entity_id === entity_id)!),1);

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
    if (!hideMessage)
      this.messageService.add({severity: "success", summary: "Entity replaced"});

    this.dump = this.updatedActivity as any;//JSON.stringify(updatedActivity, null, 2);
    this.activityEditor?.updateButtonsGrid();
    this.cdr.detectChanges();
  }


  searchEntity($event: AutoCompleteCompleteEvent) {
    if (!$event.query || $event.query.length == 0)
    {
      console.log("Search entity : whole list");
      const filteredEntities = this.entities.filter(entity => this.entity?.entity_id !== entity.entity_id);
      this.suggestions2 = [...filteredEntities.sort((a, b) => {
        return (a.name ? Helper.getEntityName(a)! : "").localeCompare(b.name ? Helper.getEntityName(b)! : "");
      })];
      this.cdr.detectChanges();
      return;
    }
    this.suggestions2 = Helper.queryEntity($event.query, this.entities).filter(entity => this.entity?.entity_id !== entity.entity_id);
    this.cdr.detectChanges();
  }

  searchOrphanEntity(item:{oldEntity:Entity, newEntity:Entity | undefined}, $event: AutoCompleteCompleteEvent) {
    this.suggestions3 = this.entities.filter(entity => entity.entity_type === item.oldEntity.entity_type &&
      Helper.getEntityName(entity).toLowerCase().includes($event.query.toLowerCase()));
  }

  searchActivityEntity($event: AutoCompleteCompleteEvent) {
    if (!this.updatedActivity?.options?.included_entities) return;
    if (!$event.query || $event.query.length == 0)
    {
      console.log("Search entity : whole list");
      const activityEntities = this.entities.filter(entity =>
        this.updatedActivity?.options?.included_entities?.find(activityEntity => activityEntity.entity_id === entity.entity_id));
      this.suggestions = activityEntities.sort((a, b) => {
        return (a.name ? Helper.getEntityName(a)! : "").localeCompare(b.name ? Helper.getEntityName(b)! : "");
      });
      this.cdr.detectChanges();
      return;
    }
    this.suggestions = Helper.queryEntity($event.query, [...this.updatedActivity!.options!.included_entities!]);
    this.cdr.detectChanges();
  }

  saveActivity()
  {
    if (!this.activity) return;
    saveAs(new Blob([JSON.stringify(this.activity)], {type: "text/plain;charset=utf-8"}),
      `${this.activity.name}.json`);
  }

  importActivity() {
    this.input_file?.nativeElement.click();
  }

  reset()
  {
    this.mode = OperationMode.Undefined;
    this.remoteOperations = [];
    this.cdr.detectChanges();
  }

  importActivityFromClipboard()
  {
    navigator.clipboard.readText().then(data => {
      this.reset();
      this.updatedActivity = JSON.parse(data);
      this.activityEditor?.updateButtonsGrid();
      console.log("Loaded activity from clipboard", this.updatedActivity);
      if (!this.updatedActivity || !this.updatedActivity.entity_id || !this.updatedActivity.options) {
        this.messageService.add({
          severity: 'error',
          summary: "Invalid data from clipboard, not an activity",
        });
        this.cdr.detectChanges();
        return;
      }
      this.reloadRemoteAndbuildData().subscribe(results => {
        if (results) {
          this.remoteOperations = results;
          this.cdr.detectChanges();
        }
      })
      this.cdr.detectChanges();
    });
  }


  loadInputFile($event: Event) {
    const file = ($event.target as any)?.files?.[0];
    let fileReader = new FileReader();
    fileReader.onload = (e) => {
      if (fileReader.result){
        this.reset();
        this.updatedActivity = JSON.parse(fileReader.result.toString());
        this.activityEditor?.updateButtonsGrid();
        console.log("Loaded activity from file", fileReader.result);
        this.reloadRemoteAndbuildData().subscribe(results => {
          if (results) {
            this.remoteOperations = results;
            this.cdr.detectChanges();
          }
        })
        this.cdr.detectChanges();
      }
    }
    fileReader.readAsText(file);
  }

  submitOrphans() {
    if (this.orphanEntities.find(item => !item.newEntity)) {
      this.messageService.add({summary: "Replace all orphan entities", severity: "error"});
      this.cdr.detectChanges();
      return;
    }
    this.orphanEntities.forEach(item => {
      this.replaceEntity(item.oldEntity.entity_id!, item.newEntity!.entity_id!, true);
    })
    this.reloadAndBuildData();
  }

  activityChanged() {
    this.remoteOperations = this.buildData();
    this.cdr.detectChanges();
  }

  operationsDone($event: RemoteOperation[]) {
    console.log("Operations executed", $event);
    this.progress = false;
    this.cdr.detectChanges();
    return this.remoteLoader!.loadRemoteData().subscribe(data => {
      if (!data || !this.updatedActivity || !this.targetRemote) return;
      this.activities = data.activities;
      this.entities = data.entities;
      this.cdr.detectChanges();
    });
  }

  private resetActivity() {
    if (!this.activity) return;
    this.reset();
    this.updatedActivity = {...this.activity};
    this.activityEditor?.updateButtonsGrid();
    this.remoteOperations = this.buildData();
    this.cdr.detectChanges();
  }
}
