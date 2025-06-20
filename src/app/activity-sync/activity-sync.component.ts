import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {ConfirmationService, MenuItem, MessageService, PrimeTemplate} from "primeng/api";
import {BlockUIModule} from "primeng/blockui";
import {SelectModule} from "primeng/select";
import {MenubarModule} from "primeng/menubar";
import {KeyValuePipe, NgForOf, NgIf} from "@angular/common";
import {ProgressSpinnerModule} from "primeng/progressspinner";
import {RemoteDataLoaderComponent} from "../remote-data-loader/remote-data-loader.component";
import {ToastModule} from "primeng/toast";
import {FormsModule} from "@angular/forms";
import {
  Activity,
  ButtonMapping, Command,
  CommandSequence,
  Config, Driver,
  Entity, OperationStatus,
  Remote,
  RemoteData, RemoteModel, RemoteModels,
  RemoteOperation, RemoteOperationResultField,
  UIPage
} from "../interfaces";
import {ServerService} from "../server.service";
import {Helper} from "../helper";
import {forkJoin, map} from "rxjs";
import {ChipModule} from "primeng/chip";
import {IconComponent} from "../controls/icon/icon.component";
import {InputTextModule} from "primeng/inputtext";
import {TableModule} from "primeng/table";
import {Popover, PopoverModule} from "primeng/popover";
import {ActivityViewerComponent} from "../activity-viewer/activity-viewer.component";
import {Button} from "primeng/button";
import {AutoCompleteCompleteEvent, AutoCompleteModule} from "primeng/autocomplete";
import {DividerModule} from "primeng/divider";
import {NEW_ACTIVITY_ID_KEY} from "../activity-editor/activity-editor.component";
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {RemoteOperationsComponent} from "../remote-operations/remote-operations.component";
import {MultiSelectModule} from "primeng/multiselect";
import {HttpErrorResponse} from "@angular/common/http";
import {Tooltip} from "primeng/tooltip";
import {RouterLink} from "@angular/router";

enum DiffStatus {
  Equals = 1,
  Different = 2,
  Missing = 3
}

interface UIpageIndexed extends UIPage
{
  index: number;
}

interface ButtonsMappingDiff
{
  button1?: ButtonMapping;
  button2?: ButtonMapping;
}

interface ActivityDiff {
  activity1?: Activity;
  activity2?: Activity;
  status: DiffStatus;
  buttons?:ButtonsMappingDiff[];
  pages?:UIpageIndexed[];
  sequences?: {[type: string]: CommandSequence[]};
  orphanEntities?: Entity[];
}

interface ActivityOperations {
  activity: Activity;
  uncompatibleCommands: ButtonMapping[];
  orphanEntities: OrphanEntity[];
  remoteOperations: RemoteOperation[];
}

interface OrphanEntity
{
  oldEntity: Entity;
  newEntity: Entity | undefined;
  activity: Activity;
  origin: ButtonMapping | UIPage | CommandSequence | string;
}

interface DriverDiff {
  driver1?: Driver;
  driver2?: Driver;
  status: DiffStatus;
}

@Component({
    selector: 'app-activity-sync',
    imports: [
        BlockUIModule,
        SelectModule,
        MenubarModule,
        NgIf,
        PrimeTemplate,
        ProgressSpinnerModule,
        RemoteDataLoaderComponent,
        ToastModule,
        FormsModule,
        ChipModule,
        IconComponent,
        InputTextModule,
        NgForOf,
        TableModule,
        KeyValuePipe,
        PopoverModule,
        ActivityViewerComponent,
        Button,
        AutoCompleteModule,
        DividerModule,
        ConfirmDialogModule,
        RemoteOperationsComponent,
        MultiSelectModule,
        Tooltip,
        RouterLink
    ],
    templateUrl: './activity-sync.component.html',
    styleUrl: './activity-sync.component.css',
    providers: [MessageService, ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class ActivitySyncComponent implements AfterViewInit {
  blockedMenu = false;
  progress = false;
  items: MenuItem[] = [
    {label: 'Home', routerLink: '/home', icon: 'pi pi-home'},
    {label: 'Analyze', command: () => this.analyze(), icon: 'pi pi-compass'},
    {label: 'Synchronize selected activities', command: () => this.syncActivities(), icon: 'pi pi-sync'},
  ]
  selectedRemote1: Remote | undefined;
  selectedRemote2: Remote | undefined;
  remotes: Remote[] = [];
  config: Config | undefined;
  remoteData1: RemoteData | undefined;
  remoteData2: RemoteData | undefined;
  drivers1: Driver[] | undefined;
  drivers2: Driver[] | undefined;
  driversDiff: DriverDiff[] = [];
  @ViewChild("loader1") remoteLoader1: RemoteDataLoaderComponent | undefined;
  @ViewChild("loader2") remoteLoader2: RemoteDataLoaderComponent | undefined;
  activitiesDiff: ActivityDiff[] = [];
  selectedSequences: CommandSequence[] | undefined;
  selectedButton: ButtonsMappingDiff | undefined;
  selectedActivity1: Activity | undefined;
  selectedActivity2: Activity | undefined;
  protected readonly Helper = Helper;
  protected readonly JSON = JSON;
  protected readonly ActivitySyncComponent = ActivitySyncComponent;
  selectedActivities: ActivityDiff[] = [];
  orphanEntities : OrphanEntity[] = [];
  private remoteModels: RemoteModels | undefined;
  activitiesOperations: ActivityOperations[] = [];
  entitiesSuggestions: Entity[] = [];
  uncompatibleCommands: {activity: Activity, buttons: ButtonMapping[]}[] = [];
  showOperations = false;
  remoteOperations: RemoteOperation[] = [];
  selectedEntity:Entity|undefined = undefined;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService,
              private confirmationService: ConfirmationService) {
    this.server.getConfig().subscribe(config => {});
  }

  ngAfterViewInit(): void {
    this.server.config$.subscribe(config => {
      if (config) this.updateRemote(config);
    });
    this.server.getRemoteModels().subscribe(remoteModels => {
      this.remoteModels = remoteModels;
      this.cdr.detectChanges();
    });
  }

  static getStatusLabel2(status : DiffStatus): string
  {
    switch(status)
    {
      case DiffStatus.Equals:
        return "Identical";
      case DiffStatus.Different:
        return "Different";
      case DiffStatus.Missing:
        return "Missing";
      default: return "Unknown";
    }
  }

  static getObjectName(entity: any): string
  {
    if (!entity) return "";
    // console.debug(entity);
    if (entity?.[Helper.getLanguageName()]) return entity[Helper.getLanguageName()];
    if (typeof entity === "string") return entity;
    if (typeof entity.name === "string") return entity.name;
    if (entity.name?.[Helper.getLanguageName()]) return entity.name[Helper.getLanguageName()];
    if (entity.name?.['en']) return entity.name['en'];
    return "";
  }

  static getStatusLabel(diff: ActivityDiff): string
  {
    switch(diff.status)
    {
      case DiffStatus.Equals:
        return "Identical";
      case DiffStatus.Different:
        return "Different";
      case DiffStatus.Missing:
        return "Missing";
      default: return "Unknown";
    }
  }

  checkIncludedEntity(orphanEntities: OrphanEntity[], sourceRemoteData: RemoteData, targetRemoteData: RemoteData, entityId: string, activity: Activity,
                      origin: ButtonMapping | UIPage | CommandSequence | string): string | undefined
  {
    let newEntityId = entityId;
    if (!targetRemoteData) return undefined;
    if (activity.options?.included_entities?.find(entity => entity.entity_id === entityId)
      && targetRemoteData.entities.find(targetEntity => targetEntity.entity_id === entityId)) return newEntityId;
    let entity = targetRemoteData.entities.find(entity => entity.entity_id === entityId);
    if (!entity)
    {
      const sourceEntity = sourceRemoteData.entities.find(entity => entity.entity_id === entityId);
      if (sourceEntity)
      {
        if (["remote", "macro"].includes(sourceEntity.entity_type))
        {
          const entityName = Helper.getEntityName(sourceEntity);
          const entity = targetRemoteData.entities.find(entity => Helper.getEntityName(entity) === entityName
            && sourceEntity.entity_type === entity.entity_type);
          if (entity) {
            console.debug("Found similar entity with same name and type but different ID", sourceEntity, entity);
            newEntityId = entity.entity_id!;
            const found = activity.options?.included_entities?.find(entity => entity.entity_id === entityId);
            if (found)
            {
              activity.options!.included_entities!.splice(activity.options!.included_entities!.indexOf(found), 1);
            }
          }
        }
      }
    }

    if (!entity)
    {
      if (!orphanEntities.find(item => item.oldEntity?.entity_id === entityId))
      {
        orphanEntities.push({oldEntity: {entity_id:entityId, entity_type: "", name: Helper.buildName("")}, newEntity: undefined,
        origin, activity});
      }
    } else if (activity.options?.included_entities?.find(item => entity!.entity_id === item.entity_id))
    {
      return newEntityId;
    }
    if (!entity) entity = {entity_id: entityId} as any;
    if (!activity.options) activity.options = {included_entities: []}
    if (!activity.options.included_entities) activity.options.included_entities = [];
    activity.options.included_entities.push(entity!);
    return newEntityId;
  }


  getRemoteModel(): RemoteModel | undefined
  {
    if (!this.remoteModels || !this.remoteData2?.version) return undefined;
    return this.remoteModels.models.find(model => model.model === this.remoteData2?.version?.model);
  }

  submitOrphans()
  {
    this.syncActivities();
  }


  // TODO : diff activity groups, missing icons
  buildData(sourceRemoteData: RemoteData, targetRemoteData: RemoteData, orphanEntities:OrphanEntity[], activity1: Activity, activity2?: Activity): ActivityOperations | undefined
  {
    this.orphanEntities = [];
    const remoteModel = this.getRemoteModel();

    const updatedActivity: Activity = {
      name: JSON.parse(JSON.stringify(activity1.name)),
      description: activity1.description,
      icon: activity1.icon,
      options: {//TODO activity_group: activity1.options?.activity_group
        included_entities: [],
        button_mapping: [],
        user_interface: {pages: []}}
    };
    if (activity1.options?.included_entities)
      updatedActivity.options!.included_entities = [...activity1.options?.included_entities!];
    if (activity1!.options?.sequences)
      updatedActivity.options!.sequences = JSON.parse(JSON.stringify(activity1.options.sequences));
    if (activity1.options?.button_mapping)
      updatedActivity.options!.button_mapping = JSON.parse(JSON.stringify(activity1.options.button_mapping));
    if (activity1.options?.user_interface?.pages)
      updatedActivity.options!.user_interface!.pages = JSON.parse(JSON.stringify(activity1.options.user_interface.pages));
    delete updatedActivity.entity_id;
    if (activity2)
      updatedActivity.entity_id = activity2.entity_id;

    const activityOperations: ActivityOperations = {
      activity: updatedActivity,
      uncompatibleCommands: [],
      remoteOperations : [],
      orphanEntities: [...orphanEntities]
    };

    orphanEntities.forEach(item => {
      if (!item.newEntity) return;
      Helper.replaceEntity(updatedActivity, targetRemoteData.entities, item.oldEntity.entity_id!, item.newEntity.entity_id!);
    });

    // Add missing included entities
    for (let sequenceName in updatedActivity!.options?.sequences)
    {
      const sequences = updatedActivity.options!.sequences[sequenceName];
      sequences.forEach(sequence => {
        if (sequence.command?.entity_id && this.checkIncludedEntity(activityOperations.orphanEntities, sourceRemoteData,
          targetRemoteData, sequence.command!.entity_id, updatedActivity!, sequence)) {
          sequence.command.entity_id = this.checkIncludedEntity(activityOperations.orphanEntities, sourceRemoteData,
            targetRemoteData, sequence.command!.entity_id, updatedActivity!, sequence)!;
        }
      })
    }
    if (!remoteModel) console.debug("Sync : remote model is not available available yet")
    else {
      console.debug("Checking remote compatibility", remoteModel);
    }
    updatedActivity!.options?.button_mapping?.forEach(button => {
      if (!button.long_press && !button.short_press && !button.double_press) return;
      if (button.long_press && this.checkIncludedEntity(activityOperations.orphanEntities, sourceRemoteData,
        targetRemoteData, button.long_press.entity_id, updatedActivity!, button))
        button.long_press.entity_id = this.checkIncludedEntity(activityOperations.orphanEntities, sourceRemoteData,
          targetRemoteData, button.long_press.entity_id, updatedActivity!, button)!;
      if (button.short_press && this.checkIncludedEntity(activityOperations.orphanEntities, sourceRemoteData,
        targetRemoteData, button.short_press.entity_id, updatedActivity!, button))
        button.short_press.entity_id = this.checkIncludedEntity(activityOperations.orphanEntities, sourceRemoteData,
          targetRemoteData, button.short_press.entity_id, updatedActivity!, button)!;
      if (button.double_press && this.checkIncludedEntity(activityOperations.orphanEntities, sourceRemoteData,
        targetRemoteData, button.double_press.entity_id, updatedActivity!, button))
        button.double_press.entity_id = this.checkIncludedEntity(activityOperations.orphanEntities, sourceRemoteData,
          targetRemoteData, button.double_press.entity_id, updatedActivity!, button)!;
      if (remoteModel && !remoteModel?.buttons?.includes(button.button)) {
        activityOperations.uncompatibleCommands.push(button);
      }
    });
    // Remove buttons not compatible with this remote model
    activityOperations.uncompatibleCommands.forEach(button => {
      const index = updatedActivity!.options?.button_mapping?.indexOf(button);
      if (index != undefined && index !== -1) updatedActivity!.options!.button_mapping!.splice(index, 1);
    })
    updatedActivity!.options?.user_interface?.pages?.forEach(page => {
      page.items.forEach(item => {
        if (item.media_player_id && this.checkIncludedEntity(activityOperations.orphanEntities, sourceRemoteData,
          targetRemoteData, item.media_player_id, updatedActivity!, page))
          item.media_player_id = this.checkIncludedEntity(activityOperations.orphanEntities, sourceRemoteData,
            targetRemoteData, item.media_player_id, updatedActivity!, page)!;
        if ((item.command as Command)?.entity_id && this.checkIncludedEntity(activityOperations.orphanEntities, sourceRemoteData,
          targetRemoteData, (item.command as Command)!.entity_id, updatedActivity!, page))
          (item.command as Command).entity_id = this.checkIncludedEntity(activityOperations.orphanEntities, sourceRemoteData,
            targetRemoteData, (item.command as Command)!.entity_id, updatedActivity!, page)!;
      })
    });

    if (updatedActivity?.options?.included_entities) {
      updatedActivity.options.included_entities.forEach(included_entity => {
        if (!targetRemoteData.entities.find(entity => entity.entity_id === included_entity.entity_id) &&
          !orphanEntities.find(item => item.oldEntity.entity_id === included_entity.entity_id))
        {
          activityOperations.orphanEntities.push({oldEntity:included_entity, newEntity: undefined, origin: "Included entity",
            activity: activity1});
        }
      })
    }

    let resultField: RemoteOperationResultField | undefined = undefined;
    const body: any = {
      name: updatedActivity.name,
      options: {}
    }
    if (updatedActivity.icon)
      body.icon = updatedActivity.icon;
    if (updatedActivity.description)
      body.description = updatedActivity.description;
    if (updatedActivity.options?.prevent_sleep)
      body.options.prevent_sleep = updatedActivity.options.prevent_sleep;
    if (updatedActivity.options?.included_entities)
      body.options.entity_ids = updatedActivity!.options!.included_entities!.map((entity) => entity.entity_id);
    if (updatedActivity.options?.sequences)
      body.options.sequences = {...updatedActivity.options.sequences};
    if (activity2)
    {
      console.log("Activity to import exists, we will update it", body);
      activity2.options?.button_mapping?.forEach(button => {
        if (updatedActivity.options?.button_mapping?.find(button2 => button2.button === button.button)) return;
        activityOperations.remoteOperations.push({activity:  updatedActivity, name: `Delete button ${button.button} ${Helper.getEntityName(updatedActivity)}`,
          method: "DELETE", api: `/api/activities/${activity2.entity_id}/buttons/${button.button}`,
          body: {}, status: OperationStatus.Todo});
      })
      activity2.options?.user_interface?.pages?.forEach(page => {
        if (page.page_id)
          activityOperations.remoteOperations.push({activity:  updatedActivity, name: `Delete page ${page.name} ${Helper.getEntityName(updatedActivity)}`,
            method: "DELETE", api: `/api/activities/${activity2.entity_id}/ui/pages/${page.page_id}`,
            body: {}, status: OperationStatus.Todo});
      });
      activityOperations.remoteOperations.push({activity:  updatedActivity, name: `Update activity ${Helper.getEntityName(updatedActivity)}`, method: "PATCH",
        api: `/api/activities/${activity2.entity_id}`, body, status: OperationStatus.Todo});
    }
    else
    {
      console.log("Activity to import does not exist, we will create it", body);
      let createOperation: RemoteOperation = {activity:  updatedActivity, name: `Create activity ${Helper.getEntityName(updatedActivity)}`, method: "POST", api: `/api/activities`,
        body, status: OperationStatus.Todo};
      activityOperations.remoteOperations.push(createOperation);
      resultField = {fieldName: "entity_id", linkedOperation: createOperation, keyName: NEW_ACTIVITY_ID_KEY};
    }

    let first = true;
    updatedActivity!.options?.user_interface?.pages?.forEach(page => {
      const newPage = {...page};
      delete newPage["page_id"];
      if (resultField) {
        if (first)
        {
          activityOperations.remoteOperations.push({activity:  updatedActivity,
            name: `Page ${page.name}`, method: "PATCH", api:
              `/api/activities/${NEW_ACTIVITY_ID_KEY}/ui/pages/main`,
            resultFields: [resultField],
            body: {
              ...newPage
            }, status: OperationStatus.Todo
          });
          first = false;
        } else
          activityOperations.remoteOperations.push({activity:  updatedActivity,
            name: `Page ${page.name}`, method: "POST", api:
              `/api/activities/${NEW_ACTIVITY_ID_KEY}/ui/pages`,
            resultFields: [resultField],
            body: {
              ...newPage
            }, status: OperationStatus.Todo
          });
      }
      else
        activityOperations.remoteOperations.push({activity:  updatedActivity, name: `Page ${page.name}`, method: "POST", api:
            `/api/activities/${updatedActivity?.entity_id}/ui/pages`,
          body: {
            ...newPage
          }, status: OperationStatus.Todo});
    })

    updatedActivity!.options?.button_mapping?.forEach(button => {
      if (!button.long_press && !button.short_press && !button.double_press) return;
      if (resultField)
        activityOperations.remoteOperations.push({activity:  updatedActivity, name: `Button ${button.button}`,method: "PATCH",
          api: `/api/activities/${NEW_ACTIVITY_ID_KEY}/buttons/${button.button}`,
          resultFields: [resultField],
          body: {
            ...button
          }, status: OperationStatus.Todo})
      else
        activityOperations.remoteOperations.push({activity:  updatedActivity, name: `Button ${button.button}`,method: "PATCH",
          api: `/api/activities/${updatedActivity?.entity_id}/buttons/${button.button}`,
          body: {
            ...button
          }, status: OperationStatus.Todo})
    });
    console.log("Updated activity", updatedActivity);
    return activityOperations;
  }

  getStatusStyle(diff?: ActivityDiff) : string
  {
    if (!diff) return 'status_unknown';
    switch(diff.status) {
      case DiffStatus.Missing: return 'status_missing';
      case DiffStatus.Equals: return 'status_identical';
      case DiffStatus.Different: return 'status_different';
      default: return 'status_unknown';
    }
  }

  getEntityName(entityId: string | undefined): string
  {
    if (!entityId) return "";
    let entity = this.remoteData1?.entities.find(entity => entity.entity_id === entityId);
    if (!entity) entity = this.remoteData2?.entities.find(entity => entity.entity_id === entityId);
    if (!entity) return "";
    return Helper.getEntityName(entity);
  }

  getEntityIcon(entityId: string | undefined): string | undefined
  {
    if (!entityId) return undefined;
    let entity = this.remoteData1?.entities.find(entity => entity.entity_id === entityId);
    if (!entity) entity = this.remoteData2?.entities.find(entity => entity.entity_id === entityId);
    if (!entity) return undefined;
    return entity.icon;
  }

  updateRemote(config: Config): void
  {
    this.config = config;
    this.remotes = config.remotes!;
    this.selectedRemote1  = Helper.getSelectedRemote(this.remotes);
    if (this.selectedRemote1) this.server.remote$.next(this.selectedRemote1);
    this.cdr.detectChanges();
  }

  compareActivities(activities1: Activity[], activities2: Activity[]) : ActivityDiff[]
  {
    let activitiesDiff = [];
    for (let activity1 of activities1)
    {
      const activity2 = activities2.find(activity2 =>
        Helper.getEntityName(activity2) == Helper.getEntityName(activity1));
      if (!activity2) {
        activitiesDiff.push({activity1: activity1, status: DiffStatus.Missing});
        continue;
      }
      const diff:ActivityDiff = {activity1: activity1, activity2: activity2, status: DiffStatus.Equals};
      activitiesDiff.push(diff);
      if (activity1.options?.button_mapping)
      {
        for (let button1 of activity1.options.button_mapping)
        {
          const button2 = activity2.options?.button_mapping?.find(button2 => button2.button === button1.button);
          if (!button2 || !Helper.compareButtons(button1, button2)){
            if (!diff.buttons) diff.buttons = [];
            diff.buttons.push({button1, button2});
          }
        }
        if (activity2.options?.button_mapping)
        for (let button2 of activity2.options.button_mapping)
        {
          const button1 = activity1.options?.button_mapping?.find(button1 => button2.button === button1.button);
          if (!button1){
            if (!diff.buttons) diff.buttons = [];
            diff.buttons.push({button2});
          }
        }
      }
      else if (activity2.options?.button_mapping)
      {
        diff.buttons = activity2.options.button_mapping.map(button2 => {return {button2}});
      }
      if (activity1.options?.user_interface?.pages)
      {
        for (let i=0;i<activity1.options.user_interface.pages.length;i++)
        {
          if (!activity2.options?.user_interface?.pages || activity2.options.user_interface.pages.length < i+1 ||
          !Helper.comparePages(activity1.options.user_interface.pages[i], activity2.options.user_interface.pages[i]))
          {
            if (!diff.pages) diff.pages = [];
            diff.pages.push({...activity1.options.user_interface.pages[i], index: i});
          }
        }
        if (activity2.options?.user_interface?.pages
          && activity2.options.user_interface.pages.length > activity1.options.user_interface.pages.length)
        {
          for (let i= activity1.options.user_interface.pages.length;i<activity2.options.user_interface.pages.length;i++)
          {
            if (!diff.pages) diff.pages = [];
            diff.pages.push({...activity2.options.user_interface.pages[i], index: i});
          }
        }
      } else if (activity2.options?.user_interface?.pages)
      {
        diff.pages = activity2.options.user_interface.pages.map((page, index) => {
          return {...page, index}});
      }

      const sequencesDiff = Helper.compareActivitySequences(activity1, activity2);
      if (Object.keys(sequencesDiff).length > 0) {
        diff.sequences = sequencesDiff;
      }

      if (diff.sequences || diff.pages || diff.buttons) diff.status = DiffStatus.Different;
    }
    for (let activity2 of activities2) {
      const activity1 = activities1.find(activity1 =>
        Helper.getEntityName(activity2) === Helper.getEntityName(activity1));
      if (!activity1) {
        activitiesDiff.push({activity2: activity2, status: DiffStatus.Missing});
      }
    }
    return activitiesDiff;
  }

  private analyze() {
    if (!this.selectedRemote1 || !this.selectedRemote2 || !this.remoteLoader1 || !this.remoteLoader2) {
      this.messageService.add({severity: "warn", summary: "Please select two remotes"});
      this.cdr.detectChanges();
      return;
    }
    if (this.selectedRemote1 == this.selectedRemote2)
    {
      this.messageService.add({severity: "warn", summary: "Please select different remotes"});
      this.cdr.detectChanges();
      return;
    }
    const tasks = [
      this.remoteLoader1.loadRemoteData().pipe(map(data => {
        this.remoteData1 = data;
        return data;
      })),
      this.remoteLoader2.loadRemoteData().pipe(map(data => {
        this.remoteData2 = data;
        return data;
      })),
      this.server.getRemoteDrivers(this.selectedRemote1).pipe(map(data => {
        this.drivers1 = data;
      })),
      this.server.getRemoteDrivers(this.selectedRemote2).pipe(map(data => {
        this.drivers2 = data;
      })),
    ];
    this.blockedMenu = true;
    this.progress = true;
    this.cdr.detectChanges();

    forkJoin(tasks).subscribe({next: results  =>
    {
      this.blockedMenu = false;
      this.progress = false;
      this.cdr.detectChanges();
      if (!this.remoteData1?.activities || !this.remoteData2?.activities) return;
      this.activitiesDiff = this.compareActivities(this.remoteData1.activities, this.remoteData2.activities);
      this.compareEntities(this.remoteData1, this.remoteData2, this.activitiesDiff);
      this.cdr.detectChanges();
      this.compareIntegrations();
      // this.activitiesDiff.sort((a1, a2) => a1.status.com)
      console.debug("Differences between activities", this.activitiesDiff);
      this.cdr.detectChanges();
    },
      error: err => {
        this.blockedMenu = false;
        this.progress = false;
        let message = "";
        if (err instanceof HttpErrorResponse)
        {
          const error = err as HttpErrorResponse;
          message = `${error.url ? error.url : ""} : ${error.message} ${error.error?.name}`;
        }
        this.messageService.add({
          severity: "error",
          summary: "Error during the extraction of activities",
          detail: message
        });
        console.error("Error during remote extraction", err);
        this.cdr.detectChanges();
      }
  })
  }

  compareEntities(remoteData1: RemoteData, remoteData2: RemoteData, activitiesDiff: ActivityDiff[]): ActivityDiff[]
  {
    remoteData1.activities.forEach(activity1 => {
      const activity2 = remoteData2.activities.find(activity2 =>
        Helper.getEntityName(activity2.name) === Helper.getEntityName(activity1.name));
      if (!activity2) return;
      let diff = activitiesDiff.find(activityDiff =>
        Helper.getEntityName(activityDiff.activity1) === Helper.getEntityName(activity1.name));
      if (!diff) {
        diff = {activity1: activity1, activity2: activity2, status: DiffStatus.Equals};
        activitiesDiff.push(diff);
      }

      activity1.options?.button_mapping?.forEach(button1 => {
        for (let button of ["long_press", "short_press", "double_press"])
        {
          const entityId = ((button1 as any)[button] as (Command|undefined))?.entity_id;
          ActivitySyncComponent.checkDiff(entityId, remoteData1, remoteData2, diff);
        }
      });
      activity1.options?.user_interface?.pages?.forEach(page => {
        page.items?.forEach(item => {
          const entityId = item.media_player_id ? item.media_player_id : (item.command as Command)?.entity_id;
          ActivitySyncComponent.checkDiff(entityId, remoteData1, remoteData2, diff);
        })
      });
      if (activity1?.options?.sequences)
        for (const [sequenceName, sequences] of Object.entries(activity1.options.sequences))
        {
            sequences.forEach(sequence => {
              if (!sequence.command) return;
              ActivitySyncComponent.checkDiff(sequence.command.entity_id, remoteData1, remoteData2, diff);
            });
        }
    })
    return activitiesDiff;
  }

  static checkDiff(entityId: string|undefined, remoteData1: RemoteData, remoteData2: RemoteData, diff: ActivityDiff)
  {
    if (entityId && !remoteData2.entities.find(entity => entity.entity_id === entityId))
    {
      const entity1 = remoteData1.entities.find(entity => entity.entity_id === entityId);
      if (entity1)
      {
        // Entity ids are checked exactly from system (should be the same), however for :
        // IR remotes, BT remotes, macros we compare against entity name
        if (["remote", "macro"].includes(entity1.entity_type))
        {
          const entityName = Helper.getEntityName(entity1);
          const entity2 = remoteData2.entities.find(entity => Helper.getEntityName(entity) === entityName
            && entity1.entity_type === entity.entity_type);
          if (entity2) {
            console.debug("Found similar entity with same name and type but different ID", entity1, entity2)
            return;
          }
        }
        diff.status = DiffStatus.Different;
        if (!diff.orphanEntities) diff.orphanEntities = [];
        if (!diff.orphanEntities.find(entity => entity.entity_id === entity1.entity_id)) {
          diff.orphanEntities.push(entity1);
        }
      }
    }
  }

  compareIntegrations()
  {
    this.driversDiff = [];
    this.drivers1?.forEach(driver1 => {
      const driver2 = this.drivers2?.find(driver2 => driver2.driver_id === driver1.driver_id);
      if (!driver2) {
        this.driversDiff.push({driver1, driver2: undefined, status: DiffStatus.Missing});
        return;
      }
      if (driver1.version !== driver2.version) {
        this.driversDiff.push({driver1, driver2, status: DiffStatus.Different});
        return;
      }
      this.driversDiff.push({driver1, driver2, status: DiffStatus.Equals});
    });
    this.drivers2?.forEach(driver2 => {
      const driver1 = this.drivers1?.find(driver1 => driver1.driver_id === driver2.driver_id);
      if (!driver1) {
        this.driversDiff.push({driver2, driver1: undefined, status: DiffStatus.Missing});
        return;
      }
    });
  }

  showButton(button : ButtonsMappingDiff, diffPanelButton: Popover, $event: MouseEvent) {
    this.selectedButton = button;
    diffPanelButton.hide();
    this.cdr.detectChanges();
    diffPanelButton.show($event, $event.target);
    this.cdr.detectChanges();
  }

  showSequence(sequences : CommandSequence[], diffPanelSequences: Popover, $event: MouseEvent) {
    this.selectedSequences = sequences;
    diffPanelSequences.show($event, $event.target);
    this.cdr.detectChanges();
  }

  showEntity(entity: Entity, entityPanel: Popover, $event: MouseEvent) {
    this.selectedEntity = entity;
    entityPanel.show($event, $event.target);
    this.cdr.detectChanges();
  }

  viewActivities(diff: ActivityDiff, actvitiesViewer: Popover, $event: MouseEvent) {
    this.selectedActivity1 = diff.activity1;
    this.selectedActivity2 = diff.activity2;
    actvitiesViewer.show($event, $event.target);
    this.cdr.detectChanges();
  }

  searchOrphanEntity(item:{oldEntity:Entity, newEntity:Entity | undefined}, $event: AutoCompleteCompleteEvent) {
    if (!this.remoteData2) return;
    if (!item.oldEntity.entity_type) {
      this.entitiesSuggestions = this.remoteData2.entities.filter(entity =>
        Helper.getEntityName(entity).toLowerCase().includes($event.query.toLowerCase()));
    } else
    this.entitiesSuggestions = this.remoteData2.entities.filter(entity => entity.entity_type === item.oldEntity.entity_type &&
      Helper.getEntityName(entity).toLowerCase().includes($event.query.toLowerCase()));
  }

  private syncActivities() {
    if (this.selectedActivities.length == 0)
    {
      this.messageService.add({severity: "warn", summary: "No activities selected"});
      this.cdr.detectChanges();
      return;
    }
    if (!this.remoteData2) return;
    this.activitiesOperations = [];
    this.uncompatibleCommands = [];
    const remoteData = this.remoteData2;
    this.selectedActivities.forEach(activity => {
      if (!activity.activity1) return;
      const data = this.buildData(this.remoteData1!, remoteData, this.orphanEntities, activity.activity1, activity.activity2);
      if (data)
      {
        this.activitiesOperations.push(data);
        if (data.uncompatibleCommands.length > 0)
          this.uncompatibleCommands.push({activity: data.activity, buttons: data.uncompatibleCommands});
        this.orphanEntities = [...data.orphanEntities];
        this.cdr.detectChanges();
      }
    });
    if (this.orphanEntities.find(item => !item.newEntity)) {
      this.messageService.add({
        severity: "warn",
        summary: "Some entities are orphans in the target remote. Replace them and submit"
      })
      this.cdr.detectChanges();
      return;
    }
    this.remoteOperations = this.activitiesOperations.map(item => item.remoteOperations).flat();
    console.log("Build results", this.activitiesOperations);
    console.log("Pending operations", this.remoteOperations);
    this.showOperations = true;
    this.cdr.detectChanges();
  }

  operationsDone($event: RemoteOperation[]) {
    this.messageService.add({
      severity: "success",
      summary: `${this.remoteOperations.length} operations done`
    });
    this.selectedActivities = [];
    this.blockedMenu = false;
    this.cdr.detectChanges();
  }

  getOrphanOriginLabel(item: OrphanEntity) {
    const prefix = Helper.getEntityName(item.activity);
    if (typeof item.origin === 'string') return prefix +" "+ item.origin;
    if (item.origin.hasOwnProperty("button"))
      return `${prefix } button : `+(item.origin as ButtonMapping).button;
    if (item.origin.hasOwnProperty("name"))
      return `${prefix} page : `+(item.origin as UIPage).name;
    if (item.origin.hasOwnProperty("type"))
      return `${prefix} sequence : `+(item.origin as CommandSequence).command?.cmd_id;
    return item.origin.toString()
  }
}
