import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {ConfirmationService, MenuItem, MessageService, PrimeTemplate} from "primeng/api";
import {BlockUIModule} from "primeng/blockui";
import {DropdownModule} from "primeng/dropdown";
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
  Config,
  Entity, OperationStatus,
  Remote,
  RemoteData, RemoteModel, RemoteModels,
  RemoteOperation, RemoteOperationResultField,
  UIPage
} from "../interfaces";
import {ServerService} from "../server.service";
import {Helper} from "../helper";
import {forkJoin, from, map} from "rxjs";
import {ChipModule} from "primeng/chip";
import {IconComponent} from "../icon/icon.component";
import {InputTextModule} from "primeng/inputtext";
import {TableModule} from "primeng/table";
import {OverlayPanel, OverlayPanelModule} from "primeng/overlaypanel";
import {ActivityViewerComponent} from "../activity-viewer/activity-viewer.component";
import {Button} from "primeng/button";
import {AutoCompleteCompleteEvent, AutoCompleteModule} from "primeng/autocomplete";
import {DividerModule} from "primeng/divider";
import {NEW_ACTIVITY_ID_KEY} from "../activity-editor/activity-editor.component";
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {RemoteOperationsComponent} from "../remote-operations/remote-operations.component";

enum ActivityStatus {
  Equals,
  Different,
  Missing
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
  status: ActivityStatus;
  buttons?:ButtonsMappingDiff[];
  pages?:UIpageIndexed[];
  sequences?: {[type: string]: CommandSequence[]};
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
}

@Component({
  selector: 'app-activity-sync',
  standalone: true,
  imports: [
    BlockUIModule,
    DropdownModule,
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
    OverlayPanelModule,
    ActivityViewerComponent,
    Button,
    AutoCompleteModule,
    DividerModule,
    ConfirmDialogModule,
    RemoteOperationsComponent
  ],
  templateUrl: './activity-sync.component.html',
  styleUrl: './activity-sync.component.css',
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ActivitySyncComponent implements OnInit {
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
  @ViewChild("loader1") remoteLoader1: RemoteDataLoaderComponent | undefined;
  @ViewChild("loader2") remoteLoader2: RemoteDataLoaderComponent | undefined;
  activitiesDiff: ActivityDiff[] = [];
  selectedSequences: CommandSequence[] | undefined;
  selectedButton: ButtonsMappingDiff | undefined;
  selectedActivity1: Activity | undefined;
  selectedActivity2: Activity | undefined;
  protected readonly Helper = Helper;
  protected readonly JSON = JSON;
  selectedActivities: ActivityDiff[] = [];
  orphanEntities : OrphanEntity[] = [];
  private remoteModels: RemoteModels | undefined;
  activitiesOperations: ActivityOperations[] = [];
  entitiesSuggestions: Entity[] = [];
  uncompatibleCommands: {activity: Activity, buttons: ButtonMapping[]}[] = [];
  showOperations = false;
  remoteOperations: RemoteOperation[] = [];

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService,
              private confirmationService: ConfirmationService) {
  }

  ngOnInit(): void {
    this.server.getConfig().subscribe(config => {
      this.updateRemote(config);
      this.server.config$.subscribe(config => {
        this.updateRemote(config);
      })
    });
    this.server.getRemoteModels().subscribe(remoteModels => {
      this.remoteModels = remoteModels;
      this.cdr.detectChanges();
    });
  }

  getStatusLabel(diff: ActivityDiff): string
  {
    switch(diff.status)
    {
      case ActivityStatus.Equals:
        return "Identical";
      case ActivityStatus.Different:
        return "Different";
      case ActivityStatus.Missing:
        return "Missing";
      default: return "Unknown";
    }
  }

  checkIncludedEntity(orphanEntities: OrphanEntity[], remoteData: RemoteData, entityId: string, activity: Activity)
  {
    if (!remoteData) return;
    if (activity.options?.included_entities?.find(entity => entity.entity_id === entityId)) return;
    let entity = remoteData.entities.find(entity => entity.entity_id === entityId);
    if (!entity)
    {
      if (!orphanEntities.find(item => item.oldEntity?.entity_id === entityId))
      {
        orphanEntities.push({oldEntity: {entity_id:entityId, entity_type: "", name: ""}, newEntity: undefined});
      }
    }
    if (!entity) entity = {entity_id: entityId} as any;
    if (!activity.options) activity.options = {included_entities: []}
    if (!activity.options.included_entities) activity.options.included_entities = [];
    activity.options.included_entities.push(entity!);
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

  buildData(targetRemoteData: RemoteData, orphanEntities:OrphanEntity[], activity1: Activity, activity2?: Activity): ActivityOperations | undefined
  {
    this.orphanEntities = [];
    const remoteModel = this.getRemoteModel();

    const updatedActivity: Activity = {
      name: Helper.getEntityName(activity1),
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
        if (sequence.command?.entity_id) this.checkIncludedEntity(activityOperations.orphanEntities, targetRemoteData,
          sequence.command!.entity_id, updatedActivity!);
      })
    }
    if (!remoteModel) console.debug("Sync : remote model is not available available yet")
    else {
      console.debug("Checking remote compatibility", remoteModel);
    }
    updatedActivity!.options?.button_mapping?.forEach(button => {
      if (!button.long_press && !button.short_press && !button.double_press) return;
      if (button.long_press) this.checkIncludedEntity(activityOperations.orphanEntities, targetRemoteData,
        button.long_press.entity_id, updatedActivity!);
      if (button.short_press) this.checkIncludedEntity(activityOperations.orphanEntities, targetRemoteData,
        button.short_press.entity_id, updatedActivity!);
      if (button.double_press) this.checkIncludedEntity(activityOperations.orphanEntities, targetRemoteData,
        button.double_press.entity_id, updatedActivity!);
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
        if (item.media_player_id) this.checkIncludedEntity(activityOperations.orphanEntities, targetRemoteData,
          item.media_player_id, updatedActivity!);
        if ((item.command as Command)?.entity_id) this.checkIncludedEntity(activityOperations.orphanEntities, targetRemoteData,
          (item.command as Command)!.entity_id, updatedActivity!);
      })
    });

    if (updatedActivity?.options?.included_entities) {
      updatedActivity.options.included_entities.forEach(included_entity => {
        if (!targetRemoteData.entities.find(entity => entity.entity_id === included_entity.entity_id) &&
          !orphanEntities.find(item => item.oldEntity.entity_id === included_entity.entity_id))
        {
          activityOperations.orphanEntities.push({oldEntity:included_entity, newEntity: undefined});
        }
      })
    }

    let resultField: RemoteOperationResultField | undefined = undefined;
    const body: any = {
      name: {
        en: Helper.getEntityName(activity2),
      },
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
      body.sequences = {...updatedActivity.options.sequences};
    if (activity2)
    {
      console.log("Activity to import exists, we will update it", body);
      activity2.options?.button_mapping?.forEach(button => {
        if (updatedActivity.options?.button_mapping?.find(button2 => button2.button === button.button)) return;
        activityOperations.remoteOperations.push({activity:  updatedActivity, name: `Delete button ${button.button} ${updatedActivity!.name}`,
          method: "DELETE", api: `/api/activities/${activity2.entity_id}/buttons/${button.button}`,
          body: {}, status: OperationStatus.Todo});
      })
      activity2.options?.user_interface?.pages?.forEach(page => {
        if (page.page_id)
          activityOperations.remoteOperations.push({activity:  updatedActivity, name: `Delete page ${page.name} ${updatedActivity!.name}`,
            method: "DELETE", api: `/api/activities/${activity2.entity_id}/ui/pages/${page.page_id}`,
            body: {}, status: OperationStatus.Todo});
      });
      activityOperations.remoteOperations.push({activity:  updatedActivity, name: `Update activity ${updatedActivity!.name}`, method: "PATCH",
        api: `/api/activities/${activity2.entity_id}`, body, status: OperationStatus.Todo});
    }
    else
    {
      console.log("Activity to import does not exist, we will create it", body);
      let createOperation: RemoteOperation = {activity:  updatedActivity, name: `Create activity ${updatedActivity!.name}`, method: "POST", api: `/api/activities`,
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
    this.cdr.detectChanges();
  }

  compareActivities(activities1: Activity[], activities2: Activity[]) : ActivityDiff[]
  {
    let activitiesDiff = [];
    for (let activity1 of activities1)
    {
      const activity2 = activities2.find(activity2 => activity2.name == activity1.name);
      if (!activity2) {
        activitiesDiff.push({activity1: activity1, status: ActivityStatus.Missing});
        continue;
      }
      const diff:ActivityDiff = {activity1: activity1, activity2: activity2, status: ActivityStatus.Equals};
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

      if (activity1.options?.sequences)
      {
        for (let sequenceName in activity1.options.sequences)
        {
          const sequences1 = activity1.options.sequences[sequenceName];
          const sequences2 = activity2.options?.sequences?.[sequenceName];
          // Sequences1 not empty and sequences2 empty
          if (sequences1.length > 0 && (!sequences2 || sequences2.length == 0))
          {
            if (!diff.sequences) diff.sequences = {};
            diff.sequences[sequenceName] = sequences1;
          }
          else if (sequences1.length > 0 && sequences2 && sequences2.length > 0) // Sequences 1 not empty
          {
            for (let i=0; i<sequences1.length; i++)
            {
              const sequence1 = sequences1[i];
              if (sequences2.length < i+1)
              {
                if (!diff.sequences) diff.sequences = {};
                if (!diff.sequences[sequenceName]) diff.sequences[sequenceName] = [];
                diff.sequences[sequenceName].push(sequence1);
              }
              else
              {
                const sequence2 = sequences2[i];
                if (!Helper.compareSequences(sequence2, sequence2))
                {
                  if (!diff.sequences) diff.sequences = {};
                  if (!diff.sequences[sequenceName]) diff.sequences[sequenceName] = [];
                  diff.sequences[sequenceName].push(sequence1);
                }
              }
            }
          }
        }
        if (activity2.options?.sequences)
        for (let sequenceName in activity2.options.sequences) {
          const sequences2 = activity2.options.sequences[sequenceName];
          const sequences1 = activity1.options.sequences[sequenceName];
          if (sequences2.length > 0 && (!sequences1 || sequences1.length == 0))
          {
            if (!diff.sequences) diff.sequences = {};
            diff.sequences[sequenceName] = sequences2;
          }
          else
          {
            if (sequences2.length > sequences1.length) {
              for (let i = sequences1.length; i < sequences2.length; i++) {
                if (!diff.sequences) diff.sequences = {};
                if (!diff.sequences[sequenceName]) diff.sequences[sequenceName] = [];
                diff.sequences[sequenceName].push(sequences2[i]);
              }
            }
          }
        }
      } else if (activity2.options?.sequences)
      {
        for (let sequenceName in activity2.options.sequences) {
          const sequences2 = activity2.options.sequences[sequenceName];
          if (sequences2.length > 0)
          {
            if (!diff.sequences) diff.sequences = {};
            diff.sequences[sequenceName] = sequences2;
          }
        }
      }
      if (diff.sequences || diff.pages || diff.buttons) diff.status = ActivityStatus.Different;
    }
    for (let activity2 of activities2) {
      const activity1 = activities1.find(activity1 => activity2.name == activity1.name);
      if (!activity1) {
        activitiesDiff.push({activity2: activity2, status: ActivityStatus.Missing});
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
      }))
    ];
    this.blockedMenu = true;
    this.progress = true;
    this.cdr.detectChanges();

    forkJoin(tasks).subscribe(results => {
      this.blockedMenu = false;
      this.progress = false;
      this.cdr.detectChanges();
      if (!this.remoteData1?.activities || !this.remoteData2?.activities) return;
      this.activitiesDiff = this.compareActivities(this.remoteData1.activities, this.remoteData2.activities);
      console.debug("Differences between activities", this.activitiesDiff);
      this.cdr.detectChanges();
    })
  }

  showButton(button : ButtonsMappingDiff, diffPanelButton: OverlayPanel, $event: MouseEvent) {
    this.selectedButton = button;
    diffPanelButton.show($event, $event.target);
    this.cdr.detectChanges();
  }

  showSequence(sequences : CommandSequence[], diffPanelSequences: OverlayPanel, $event: MouseEvent) {
    this.selectedSequences = sequences;
    diffPanelSequences.show($event, $event.target);
    this.cdr.detectChanges();
  }

  viewActivities(diff: ActivityDiff, actvitiesViewer: OverlayPanel, $event: MouseEvent) {
    this.selectedActivity1 = diff.activity1;
    this.selectedActivity2 = diff.activity2;
    actvitiesViewer.show($event, $event.target);
    this.cdr.detectChanges();
  }

  searchOrphanEntity(item:{oldEntity:Entity, newEntity:Entity | undefined}, $event: AutoCompleteCompleteEvent) {
    if (!this.remoteData2) return;
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
      const data = this.buildData(remoteData, this.orphanEntities, activity.activity1, activity.activity2);
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
  }
}
