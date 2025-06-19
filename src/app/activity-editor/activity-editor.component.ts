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
import {SelectModule} from "primeng/select";
import {MenubarModule} from "primeng/menubar";
import {NgForOf, NgIf} from "@angular/common";
import {ProgressBarModule} from "primeng/progressbar";
import {ProgressSpinnerModule} from "primeng/progressspinner";
import {ToastModule} from "primeng/toast";
import {FormsModule} from "@angular/forms";
import {
  Activity,
  ActivityPageCommand,
  ButtonMapping,
  Command, CommandMapping,
  Config,
  Entity, EntityFeature,
  LanguageCode,
  OperationStatus,
  Remote,
  RemoteData,
  RemoteMap,
  RemoteModel,
  RemoteModels,
  RemoteOperation,
  RemoteOperationResultField,
  RemoteVersion,
  UIPage
} from "../interfaces";
import {
  ActivityChange,
  ActivityChangeType,
  ActivityViewerComponent
} from "../activity-viewer/activity-viewer.component";
import {NgxJsonViewerModule} from "ngx-json-viewer";
import {MultiSelectModule} from "primeng/multiselect";
import {CheckboxModule} from "primeng/checkbox";
import {ButtonModule} from "primeng/button";
import {Helper} from "../helper";
import {AutoCompleteCompleteEvent, AutoCompleteModule} from "primeng/autocomplete";
import {RemoteOperationsComponent} from "../remote-operations/remote-operations.component";
import {DialogModule} from "primeng/dialog";
import {saveAs} from "file-saver-es";
import {map, Observable} from "rxjs";
import {RemoteDataLoaderComponent} from "../remote-data-loader/remote-data-loader.component";
import {ChipModule} from "primeng/chip";
import {InputTextModule} from "primeng/inputtext";
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {BlockUIModule} from "primeng/blockui";
import {DividerModule} from "primeng/divider";
import {TagModule} from "primeng/tag";
import {ToggleButtonModule} from "primeng/togglebutton";
import {IconSelectorComponent} from "../controls/icon-selector/icon-selector.component";
import {IconComponent} from "../controls/icon/icon.component";
import {ToolbarModule} from "primeng/toolbar";
import {RemoteWidgetComponent} from "../remote-widget/remote-widget.component";
import {MessageModule} from "primeng/message";
import {ActivityEntitiesComponent} from "./activity-entities/activity-entities.component";

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
    SelectModule,
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
    DialogModule,
    RemoteDataLoaderComponent,
    ChipModule,
    InputTextModule,
    ConfirmDialogModule,
    BlockUIModule,
    DividerModule,
    TagModule,
    ToggleButtonModule,
    IconSelectorComponent,
    IconComponent,
    ToolbarModule,
    RemoteWidgetComponent,
    MessageModule,
    ActivityEntitiesComponent
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
  progress = false;
  remoteProgress = 0;
  progressDetail = "";
  availableItems: MenuItem[] = [
    {label: 'Home', routerLink: '/home', icon: 'pi pi-home'},
    {label: 'Reload remote data', command: () => this.reloadAndBuildData(false), icon: 'pi pi-refresh'},
    // {label: 'View original activity', command: () => this.viewerVisible = true, icon: 'pi pi-folder-open'},
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
  mode: OperationMode = OperationMode.Undefined;
  showOperations = false;
  orphanEntities : {oldEntity:Entity, newEntity:Entity | undefined}[] = [];
  uncompatibleCommands: CommandMapping[] = [];

  @ViewChild("editor") activityViewer: ActivityViewerComponent | undefined;
  @ViewChild(RemoteOperationsComponent) operations: RemoteOperationsComponent | undefined;
  @ViewChild("input_file", {static: false}) input_file: ElementRef | undefined;
  @ViewChild(RemoteDataLoaderComponent) remoteLoader: RemoteDataLoaderComponent | undefined;

  selectedEntity: Entity | undefined;
  suggestions: Entity[] = [];
  suggestions2: Entity[] = [];
  suggestions3: Entity[] = [];
  targetRemote: Remote | undefined;
  existingActivity = false;
  recreateMapping = false;
  lockOperations = false;
  version: RemoteVersion | undefined;
  remoteModels: RemoteModels | undefined;
  activityOperations: ActivityChange[] = [];
  currentLanguage: LanguageCode = Helper.getLanguageName();
  featuresMap: EntityFeature[] = [];

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService,
              private activatedRoute: ActivatedRoute, private confirmationService: ConfirmationService) {
  }

  ngOnInit(): void {
    this.initMenu();
    this.server.getPictureRemoteMap().subscribe(butonsMap => {
      this.buttonsMap = butonsMap;
      this.cdr.detectChanges();
    })
    this.server.getTemplateRemoteMap().subscribe(templates => {
      this.templates = templates;
      if (!this.lockOperations) this.remoteOperations = this.buildData();
      this.cdr.detectChanges();
    })
    const data = localStorage.getItem("remoteData");
    if (data)
    {
      const remoteData: RemoteData = JSON.parse(data);
      if (remoteData.activities) this.activities = remoteData.activities;
      if (remoteData.entities) this.entities = remoteData.entities;
      this.server.setEntities(this.entities);
      this.server.setActivities(this.activities);
      this.remoteOperations = this.buildData();
      this.cdr.detectChanges();
    }
    this.server.getRemoteModels().subscribe(remoteModels => {
      this.remoteModels = remoteModels;
      this.buildData();
      this.cdr.detectChanges();
    })
    this.server.getFeaturesMap().subscribe(features => {
      this.featuresMap = features;
    })
  }

  ngAfterViewInit(): void {
    this.server.getConfig().subscribe(config => {
      if (config) this.updateRemote(config).subscribe(config => this.buildData());
      if (config?.language) {
        this.currentLanguage = config.language as LanguageCode;
        this.cdr.detectChanges();
      }
    })
    this.server.config$.subscribe(config => {
      if (config) {
        this.updateRemote(config).subscribe(config => this.buildData());
        if (config.language) this.currentLanguage = config.language as LanguageCode;
      }
    })

    this.activatedRoute.queryParams.subscribe(param => {
      const source = param['source'];
      if (source)
      {
        if (!this.targetRemote)
        {
          this.server.getConfig().subscribe(config => {
            this.updateRemote(config).subscribe(results => {
              if (source === 'file')
                this.importActivity();
              else if (source === 'clipboard')
                this.importActivityFromClipboard();
              this.cdr.detectChanges();
            })
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
          this.updateRemote(config).subscribe(results => {this.buildData()});
          this.reloadAndBuildData();
        });
      } else {
        this.remoteOperations = this.buildData();
      }
      this.cdr.detectChanges();

    })
  }

  initFromId()
  {

  }

  initMenu()
  {
    // if (this.updatedActivity)
    this.items = [...this.availableItems];
    //this.items = [...this.availableItems.filter(item => item.label !== 'Save activity to remote')];
  }

  getRemoteModel(): RemoteModel | undefined
  {
    if (!this.remoteModels || !this.version) return undefined;
    return this.remoteModels.models.find(model => model.model === this.version?.model);
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

  reloadAndBuildData(showOperations = true)
  {
    this.reloadRemoteAndbuildData(showOperations).subscribe({next: results => {
        this.messageService.add({severity: "success", summary: "Activity imported successfully"});
        console.log("Pending operations", this.remoteOperations);
        this.dump = this.remoteOperations;
        if (results) this.remoteOperations = results;
        if (showOperations && !this.orphanEntities.find(entity => entity.newEntity == undefined))
          this.showOperations = true;
        this.cdr.detectChanges();
      }, error: error => {
        this.messageService.add({severity: "error", summary: "Failed to import activity"});
        this.cdr.detectChanges();
      }})
  }

  reloadRemoteAndbuildData(showOperations = true): Observable<RemoteOperation[] | undefined>
  {
    this.messageService.add({severity: "info", summary: "Loading target remote data..."});
    this.cdr.detectChanges();
    return this.remoteLoader!.loadRemoteData().pipe(map(data => {
      if (!data || !this.updatedActivity || !this.targetRemote) return [];
      this.activities = data.activities;
      this.entities = data.entities;
      this.version = data.version;
      this.cdr.detectChanges();
      const remoteOperations = this.buildData();
      if (showOperations) this.checkExistingActivity();
      return remoteOperations;
    }))
  }

  checkExistingActivity()
  {
    if (this.mode != OperationMode.Undefined) return;
    if (this.activities.find(activity => activity.entity_id === this.updatedActivity?.entity_id)) {
      this.confirmationService.confirm({key: "confirmEditor",
        header: `Activity "${Helper.getEntityName(this.updatedActivity)}" to import already exists`,
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
    if (!entityId) return;
    if (activity.options?.included_entities?.find(entity => entity.entity_id === entityId)) return;
    let entity = this.entities.find(entity => entity.entity_id === entityId);
    if (!entity)
    {
      if (!this.orphanEntities.find(item => item.oldEntity?.entity_id === entityId))
      {
        this.orphanEntities.push({oldEntity: {entity_id:entityId, entity_type: "", name: Helper.buildName("")}, newEntity: undefined});
      }
    }
    if (!entity) entity = {entity_id: entityId} as any;
    if (!activity.options) activity.options = {included_entities: []}
    if (!activity.options.included_entities) activity.options.included_entities = [];
    console.debug("Adding missing included entity", entityId, entity);
    activity.options.included_entities.push(entity!);
  }

  buildDataAndShowOperations()
  {
    if (!this.lockOperations) this.remoteOperations = this.buildData();
    this.showOperations = true;
    this.cdr.detectChanges();
  }

  buildData(): RemoteOperation[]
  {
    const remoteOperations: RemoteOperation[] = [];
    if (!this.activities) return remoteOperations;
    this.orphanEntities = [];
    if (this.activity_id) this.activity = this.activities.find(activity => activity.entity_id === this.activity_id);
    const remoteModel = this.getRemoteModel();
    if (!this.updatedActivity && this.activity)
    {
      this.updatedActivity = {
        entity_id: this.activity.entity_id,
        name: JSON.parse(JSON.stringify(this.activity.name)),
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
      this.activityViewer?.updateButtonsGrid();
    }

    if (!this.updatedActivity || !this.targetRemote) return remoteOperations;

    if (this.uncompatibleCommands.length > 0)
    {
      this.updatedActivity.options?.button_mapping?.push(...this.uncompatibleCommands);
      this.uncompatibleCommands = [];
    }

    // Add missing included entities
    for (let sequenceName in this.updatedActivity!.options?.sequences)
    {
      const sequences = this.updatedActivity.options!.sequences[sequenceName];
      sequences.forEach(sequence => {
        if (sequence.command?.entity_id) {
          this.checkIncludedEntity(sequence.command!.entity_id, this.updatedActivity!);
          let entity = this.entities.find(entity => entity.entity_id === sequence.command!.entity_id);
          if (entity && sequence.command?.cmd_id && !Helper.checkCommandCompatibility(this.featuresMap, entity, sequence.command.cmd_id)) {
            console.warn("The new entity has an incompatible command", sequence.command);
            this.uncompatibleCommands.push({sequence: sequenceName, button: "",
              short_press: {entity_id: entity.entity_id!,cmd_id: sequence.command!.cmd_id}})
          }
        }
      })
    }
    if (!remoteModel) console.debug("Sync : remote model is not available available yet")
    else {
      console.debug("Checking remote compatibility", remoteModel);
    }
    this.updatedActivity!.options?.button_mapping?.forEach(button => {
      if (!button.long_press && !button.short_press && !button.double_press) return;
      if (button.long_press) this.checkIncludedEntity(button.long_press.entity_id, this.updatedActivity!);
      if (button.short_press) this.checkIncludedEntity(button.short_press.entity_id, this.updatedActivity!);
      if (button.double_press) this.checkIncludedEntity(button.double_press.entity_id, this.updatedActivity!);
      if (remoteModel && !remoteModel?.buttons?.includes(button.button)) {
        this.uncompatibleCommands.push(button);
      }
    });
    // Remove buttons not compatible with this remote model
    this.uncompatibleCommands.forEach(button => {
      if (button.sequence) {
        const index = this.updatedActivity!.options?.sequences?.[button.sequence]
          .findIndex(item => item.command?.entity_id === button.short_press?.entity_id &&
            item.command?.cmd_id === button.short_press?.cmd_id);
        if (index) {
          this.updatedActivity!.options!.sequences?.[button.sequence]!.splice(index, 1);
        }
        return
      }
      const index = this.updatedActivity!.options?.button_mapping?.indexOf(button);
      if (index != undefined && index !== -1) this.updatedActivity!.options!.button_mapping!.splice(index, 1);
    })
    this.updatedActivity!.options?.user_interface?.pages?.forEach(page => {
      page.items.forEach(item => {
        if (item.media_player_id) this.checkIncludedEntity(item.media_player_id, this.updatedActivity!);
        if ((item.command as Command)?.entity_id) this.checkIncludedEntity((item.command as Command)!.entity_id, this.updatedActivity!);
      })
    });

    if (this.updatedActivity?.options?.included_entities) {
      this.updatedActivity.options.included_entities.forEach(included_entity => {
        if (!this.entities.find(entity => entity.entity_id === included_entity.entity_id) &&
        !this.orphanEntities.find(item => item.oldEntity.entity_id === included_entity.entity_id))
        {
          this.orphanEntities.push({oldEntity:included_entity, newEntity: undefined});
        }
      })
    }

    // Create or update
    if (this.mode == OperationMode.CreateMode)
      delete this.updatedActivity?.entity_id;
    const activity = this.activities.find(activity => activity.entity_id === this.updatedActivity?.entity_id);

    let resultField: RemoteOperationResultField | undefined = undefined;
    const body: any = {
      name: this.updatedActivity.name,
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
      body.options.sequences = {...this.updatedActivity.options.sequences};
    if (activity)
    {
      this.existingActivity = true;
      console.log("Activity to import exists, we will update it", body);
      if (this.recreateMapping) {
        activity.options?.button_mapping?.forEach(button => {
          if (this.updatedActivity?.options?.button_mapping?.find(button2 => button2.button === button.button))
            return;
          remoteOperations.push({name: `Delete button ${button.button} ${Helper.getEntityName(this.updatedActivity)}`,
            method: "DELETE", api: `/api/activities/${activity.entity_id}/buttons/${button.button}`,
            body: {}, status: OperationStatus.Todo});
        })
        activity.options?.user_interface?.pages?.forEach(page => {
          if (page.page_id)
            remoteOperations.push({
              name: `Delete page ${page.name} ${Helper.getEntityName(this.updatedActivity)}`,
              method: "DELETE", api: `/api/activities/${activity.entity_id}/ui/pages/${page.page_id}`,
              body: {}, status: OperationStatus.Todo
            });
        });
      }

      // Check if included entities or sequences need an update
      if (!this.recreateMapping)
      {
        let diff = false;
        if (this.activityOperations.filter(item => item.type === ActivityChangeType.AddIncludedEntity ||
          item.type === ActivityChangeType.DeleteIncludedEntity ||
          item.type === ActivityChangeType.ModifiedSequence ||
          item.type === ActivityChangeType.ModifiedName ||
          item.type === ActivityChangeType.ModifiedIcon)) diff = true;

        if (this.activity) {
          const entitiesDiff = Helper.compareActivityEntities(this.activity, this.updatedActivity);
          if (entitiesDiff.length > 0) diff = true;
          const sequencesDiff = Helper.compareActivitySequences(this.activity, this.updatedActivity);
          if (Object.keys(sequencesDiff).length > 0) {
            diff = true;
          }
        }

        if (diff)
          remoteOperations.push({name: `Update activity ${Helper.getEntityName(this.updatedActivity)}`, method: "PATCH",
            api: `/api/activities/${activity.entity_id}`, body, status: OperationStatus.Todo});
      }
      else
        remoteOperations.push({name: `Update activity ${Helper.getEntityName(this.updatedActivity)}`, method: "PATCH",
          api: `/api/activities/${activity.entity_id}`, body, status: OperationStatus.Todo});
    }
    else
    {
      this.existingActivity = false;
      console.log("Activity to import does not exist, we will create it", body);
      let createOperation: RemoteOperation = {name: `Create activity ${Helper.getEntityName(this.updatedActivity)}`, method: "POST", api: `/api/activities`,
        body, status: OperationStatus.Todo};
      remoteOperations.push(createOperation);
      resultField = {fieldName: "entity_id", linkedOperation: createOperation, keyName: NEW_ACTIVITY_ID_KEY};
    }

    if (!this.recreateMapping) {
      console.debug("Operations on UI pages in delta", this.activityOperations);
      this.activityOperations.forEach(operation => {
        if (!operation.page) return;
        if (operation.type === ActivityChangeType.NewPage)
          remoteOperations.push({
            name: `Page ${operation.page.name}`, method: "POST", api:
              `/api/activities/${this.updatedActivity?.entity_id}/ui/pages`,
            body: {
              ...operation.page
            }, status: OperationStatus.Todo
          });
        else if (operation.type === ActivityChangeType.ModifiedPage && operation.page?.page_id)
          remoteOperations.push({
            name: `Page ${operation.page.name}`, method: "PATCH", api:
              `/api/activities/${this.updatedActivity?.entity_id}/ui/pages/${operation.page.page_id}`,
            body: {
              ...operation.page
            }, status: OperationStatus.Todo
          });
        else if (operation.type === ActivityChangeType.DeletedPage && operation.page?.page_id)
          remoteOperations.push({
            name: `Page ${operation.page.name}`, method: "DELETE", api:
              `/api/activities/${this.updatedActivity?.entity_id}/ui/pages/${operation.page.page_id}`,
            body: {}, status: OperationStatus.Todo
          });
      });
      this.activityOperations.forEach(operation => {
        if (operation.type === ActivityChangeType.ModifiedButton && operation.button)
          remoteOperations.push({name: `Button ${operation.button.button}`,method: "PATCH",
            api: `/api/activities/${this.updatedActivity?.entity_id}/buttons/${operation.button.button}`,
            body: {
              ...operation.button
            }, status: OperationStatus.Todo})
        else if (operation.type === ActivityChangeType.DeletedButton && operation.button)
          remoteOperations.push({name: `Button ${operation.button.button}`,method: "DELETE",
            api: `/api/activities/${this.updatedActivity?.entity_id}/buttons/${operation.button.button}`,
            body: {}, status: OperationStatus.Todo})
      });
    }
    else {
      let first = true;
      this.updatedActivity!.options?.user_interface?.pages?.forEach(page => {
        const newPage = {...page};
        delete newPage["page_id"];
        // resultField : means that the activity is new and being created
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
        else {
          // Pages have been deleted before so we recreate all of them
          remoteOperations.push({name: `Page ${page.name}`, method: "POST", api:
              `/api/activities/${this.updatedActivity?.entity_id}/ui/pages`,
            body: {
              ...newPage
            }, status: OperationStatus.Todo});
        }
      });
      this.updatedActivity!.options?.button_mapping?.forEach(button => {
        if (!button.long_press && !button.short_press && !button.double_press) return;
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
    }


    if (this.uncompatibleCommands.length > 0) this.activityViewer?.updateButtons();
    console.log("Updated activity", this.updatedActivity);
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
    this.recreateMapping = false;
    this.applyTemplateOnActivity(this.updatedActivity!);
    this.remoteOperations = this.buildData();
    this.lockOperations = false;
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
      this.messageService.add({severity: "error", summary: `This entity ${Helper.getEntityName(this.selectedEntity)} (${this.selectedEntity.entity_id}) is not referenced`})
      this.cdr.detectChanges();
      return;
    }
    console.log("Apply template to entity", entity, template)
    if (!template) return;
    const selectedFeatures = this.selectedFeatures.map(item => item.value);
    console.log("Selected features to map : ", selectedFeatures);
    template.buttons?.forEach(button => {
      const existing_assignment = updatedActivity?.options?.button_mapping?.find(existing_button =>
        existing_button.button === button.button && (existing_button.long_press || existing_button.short_press || existing_button.double_press)
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
      this.activityOperations.push({type: ActivityChangeType.ModifiedButton, button: targetButton})
    })
    // console.log("BUTTONS", this.updatedActivity?.options?.button_mapping)

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
        this.activityOperations.push({type: ActivityChangeType.NewPage, page: targetPage});
      }
      else if (!this.activityOperations.find(item => item.page?.page_id === targetPage?.page_id)){
        this.activityOperations.push({type: ActivityChangeType.ModifiedPage, page: targetPage});
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
    this.activityViewer?.updateButtonsGrid();
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

  updateRemote(config: Config): Observable<any>
  {
    this.config = config;
    this.remotes = config.remotes!;
    this.targetRemote  = Helper.getSelectedRemote(this.remotes);
    if (this.targetRemote)
      this.server.remote$.next(this.targetRemote);
    return this.server.getRemoteVersion(this.targetRemote!).pipe(map(version => {
        this.version = version;
        this.buildData();
        this.cdr.detectChanges();
      }));
  }

  setRemote(remote: Remote): void
  {
    Helper.setRemote(remote);
    this.server.remote$.next(remote);
    this.reloadAndBuildData(false);
  }

  remoteLoaded($event: RemoteData | undefined) {
    if ($event)
    {
      if (!this.lockOperations) this.reset();
      this.version = $event.version;
      this.activities = $event.activities;
      this.entities = $event.entities;
      this.activities.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.entities.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      if (!this.lockOperations) this.remoteOperations = this.buildData();
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

  replaceEntity(entity_id: string, new_entity_id: string, hideMessage = false)
  {
    const newEntity = this.entities.find(entity => entity.entity_id === new_entity_id);
    if (!this.updatedActivity || !newEntity) return;
    // this.recreateMapping = true;
    const activityChanges = Helper.replaceEntity(this.updatedActivity, this.entities, entity_id, new_entity_id);
    this.activityOperations.push(...activityChanges);
    if (!hideMessage)
      this.messageService.add({severity: "success", summary: "Entity replaced"});

    this.dump = this.updatedActivity as any;//JSON.stringify(updatedActivity, null, 2);
    this.activityViewer?.updateButtonsGrid();
    this.buildData();
    const activity = this.updatedActivity;
    this.updatedActivity = undefined;
    this.cdr.detectChanges();
    this.updatedActivity = activity;
    this.cdr.detectChanges();
  }


  searchEntity($event: AutoCompleteCompleteEvent) {
    if (!$event.query || $event.query.length == 0)
    {
      console.log("Search entity : whole list");
      const filteredEntities = this.entities.filter(entity => this.entity?.entity_id !== entity.entity_id &&
        this.entity?.entity_type == entity.entity_type);
      this.suggestions2 = [...filteredEntities.sort((a, b) => {
        return (a.name ? Helper.getEntityName(a)! : "").localeCompare(b.name ? Helper.getEntityName(b)! : "");
      })];
      this.cdr.detectChanges();
      return;
    }
    this.suggestions2 = Helper.queryEntity($event.query, this.entities).filter(entity => this.entity?.entity_id !== entity.entity_id
      && this.entity?.entity_type == entity.entity_type);
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
      this.suggestions.forEach(entity => {
        const included_entity = this.updatedActivity?.options?.included_entities?.find(activityEntity => activityEntity.entity_id === entity.entity_id);
        if (included_entity?.integration) entity.integration = included_entity.integration;
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
    console.debug("Save activity to file", Helper.getEntityName(this.activity), this.activity);
    saveAs(new Blob([JSON.stringify(this.activity)], {type: "text/plain;charset=utf-8"}),
      `${Helper.getEntityName(this.activity)}.json`);
  }

  importActivity() {
    this.input_file?.nativeElement.click();
  }

  reset()
  {
    this.mode = OperationMode.Undefined;
    this.remoteOperations = [];
    this.activityOperations = [];
    this.cdr.detectChanges();
  }

  importActivityFromClipboard()
  {
    navigator.clipboard.readText().then(data => {
      this.reset();
      this.updatedActivity = JSON.parse(data);
      this.activityViewer?.updateButtonsGrid();
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
        this.activityViewer?.updateButtonsGrid();
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

  activityChanged($event: ActivityChange) {
    if ($event.type == ActivityChangeType.DeletedPage)
      this.activityOperations.push({type: ActivityChangeType.DeletedPage, page: $event.page})
    else if ($event.type == ActivityChangeType.NewPage)
      this.activityOperations.push({type: ActivityChangeType.NewPage, page: $event.page})
    else if ($event.type == ActivityChangeType.ModifiedPage  && $event.page?.page_id
      && !this.activityOperations.find(item => item.page?.page_id == $event.page?.page_id))
      this.activityOperations.push({type: ActivityChangeType.ModifiedPage, page: $event.page})
    else if ($event.type == ActivityChangeType.ModifiedButton && $event.button
      && !this.activityOperations.find(item => item.button?.button == $event.button?.button
      && $event.type == ActivityChangeType.ModifiedButton))
      this.activityOperations.push({type: ActivityChangeType.ModifiedButton, button: $event.button})
    else if ($event.type == ActivityChangeType.DeletedButton && $event.button
      && !this.activityOperations.find(item => item.button?.button == $event.button?.button
        && $event.type == ActivityChangeType.DeletedButton))
      this.activityOperations.push({type: ActivityChangeType.DeletedButton, button: $event.button})
    if (!this.lockOperations) this.remoteOperations = this.buildData();
    this.cdr.detectChanges();
  }

  operationsDone($event: RemoteOperation[]) {
    console.log("Operations executed", $event);
    this.progress = false;
    this.lockOperations = true;
    this.cdr.detectChanges();
    this.remoteLoader!.loadRemoteData().subscribe(data => {
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
    this.activityViewer?.updateButtonsGrid();
    this.remoteOperations = this.buildData();
    this.cdr.detectChanges();
  }

  reloadActivity() {
    if (!this.updatedActivity?.entity_id) return;
    this.remoteLoader?.reloadActivity(this.updatedActivity.entity_id).subscribe(activity => {
      if (!activity || !this.updatedActivity?.options?.user_interface) return;
      this.updatedActivity.options.user_interface = JSON.parse(JSON.stringify(activity.options?.user_interface));
      this.cdr.detectChanges();
      this.activityViewer?.updateButtonsGrid();
      this.cdr.detectChanges();
    })
  }

  iconSelected($event: string) {
    if (!this.updatedActivity) return;
    this.updatedActivity.icon = $event;
    this.activityOperations.push({type: ActivityChangeType.ModifiedIcon,
      icon:$event});
    this.cdr.detectChanges();
  }

  changedActivityName($event: any) {
    this.activityOperations.push({type: ActivityChangeType.ModifiedName,
      name:this.updatedActivity?.name?.[this.currentLanguage]});
  }
}
