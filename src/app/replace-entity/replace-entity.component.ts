import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {
    Activity,
    Command,
    CommandSequence,
    Config,
    Context,
    Entity,
    Macro,
    OperationStatus,
    OrphanEntity,
    Profile,
    Remote, RemoteData,
    RemoteOperation
} from "../interfaces";
import {MenuItem, MessageService, SharedModule} from "primeng/api";
import {ServerService} from "../server.service";
import {ActivatedRoute} from "@angular/router";
import {DropdownModule} from "primeng/dropdown";
import {MenubarModule} from "primeng/menubar";
import {DatePipe, NgForOf, NgIf} from "@angular/common";
import {ProgressBarModule} from "primeng/progressbar";
import {ProgressSpinnerModule} from "primeng/progressspinner";
import {ToastModule} from "primeng/toast";
import {FormsModule} from "@angular/forms";
import {ChipModule} from "primeng/chip";
import {TableModule} from "primeng/table";
import {EntityViewerComponent} from "../remote-browser/entity-viewer/entity-viewer.component";
import {ButtonModule} from "primeng/button";
import {RemoteOperationsComponent} from "../remote-operations/remote-operations.component";
import {forkJoin, from, map, mergeMap, Observable} from "rxjs";
import {MessagesModule} from "primeng/messages";
import {MultiSelectModule} from "primeng/multiselect";
import {Helper} from "../helper";
import {AutoCompleteModule} from "primeng/autocomplete";
import {CheckboxModule} from "primeng/checkbox";
import {RemoteDataLoaderComponent} from "../remote-data-loader/remote-data-loader.component";

class Message {
  title: string = "";
  message: string = "";
}

@Component({
  selector: 'app-replace-entity',
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
    ChipModule,
    NgForOf,
    TableModule,
    EntityViewerComponent,
    ButtonModule,
    RemoteOperationsComponent,
    MessagesModule,
    DatePipe,
    MultiSelectModule,
    AutoCompleteModule,
    CheckboxModule,
    RemoteDataLoaderComponent,
  ],
  templateUrl: './replace-entity.component.html',
  styleUrl: './replace-entity.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ReplaceEntityComponent implements OnInit{
  remoteOperations: RemoteOperation[] = [];
  config: Config | undefined;
  remotes: Remote[] | undefined;
  selectedRemote: Remote | undefined;
  activities: Activity[] = [];
  entities: Entity[] = [];
  progress = false
  availableItems: MenuItem[] = [
    {label: 'Home', routerLink: '/home', icon: 'pi pi-home'},
    {label: 'Load Remote data', command: () => this.remoteLoader?.load(), icon: 'pi pi-history', block: true},
  ]
  items: MenuItem[] = [];
  readonly Math = Math;
  remoteProgress = 0;
  progressDetail = "";
  replaceEntities: {oldEntity: Entity | undefined, newEntity: Entity | undefined}[] = [{oldEntity: undefined, newEntity: undefined}];
  profiles: Profile[] | undefined;
  localMode: boolean = false;
  orphanEntities: OrphanEntity[] = [];
  messages: Message[] = [];
  replaceProfiles = true;
  replaceMacros = true;
  replaceActivities = true;

  @ViewChild(RemoteOperationsComponent) operations: RemoteOperationsComponent | undefined;
  @ViewChild(RemoteDataLoaderComponent) remoteLoader: RemoteDataLoaderComponent | undefined;

  context: Context | undefined;
  availableEntities: Entity[] = [];
  macros: Macro[] = [];

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {}

  ngOnInit(): void {
    this.initMenu();
    this.server.getConfig().subscribe(config => {
      this.updateRemote(config);
      this.server.config$.subscribe(config => {
        this.updateRemote(config);
      })
    })
    const data = localStorage.getItem("remoteData");
    if (data) {
      const remoteData: RemoteData = JSON.parse(data);
      if (remoteData.activities) this.activities = remoteData.activities;
      if (remoteData.entities) {
        this.entities = remoteData.entities;
      }
      if (remoteData.profiles) this.profiles = remoteData.profiles;
      if (remoteData.context) this.context = remoteData.context;
      if (remoteData.macros) this.macros = remoteData.macros;
      this.server.setEntities(this.entities);
      this.orphanEntities = Helper.getOrphans(this.activities, this.entities)
      this.entities.push(...this.orphanEntities.map(entity => {
        const item = {...entity};
        item.name = Helper.getEntityName(entity);
        return item;
      }));
      this.availableEntities = [...this.entities];
      this.cdr.detectChanges();
    }
  }

  initMenu()
  {
    this.items = [...this.availableItems];
  }

  getUsedActivities(entity: Entity): Activity[]
  {
    if (!entity.entity_id) return [];
    return this.activities.filter(activity => activity.options?.included_entities?.find(includedEntity =>
      includedEntity.entity_id == entity.entity_id
    ));
  }

  updateRemote(config: Config): void
  {
    this.config = config;
    this.remotes = config.remotes!;
    this.selectedRemote  = Helper.getSelectedRemote(this.remotes);
    if (this.selectedRemote) this.server.remote$.next(this.selectedRemote);
    this.cdr.detectChanges();
  }

  setRemote(remote: Remote): void
  {
    Helper.setRemote(remote);
    this.server.remote$.next(remote);
    this.cdr.detectChanges();
    if (!this.context || this.context.remote_ip !== `${remote.address}:${remote.port}`)
      this.remoteLoader?.load();
  }

  remoteLoaded($event: RemoteData | undefined) {
    if ($event)
    {
      this.activities = $event.activities;
      this.orphanEntities = $event.orphanEntities;
      this.entities = $event.entities;
      this.profiles = $event.profiles;
      this.context = $event.context;
      this.entities.push(...this.orphanEntities.map(entity => {
        const item = {...entity};
        item.name = Helper.getEntityName(entity);
        return item;
      }));
      this.activities.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.entities.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.profiles.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.orphanEntities.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.cdr.detectChanges();
    }
  }

  getStyle(value: string): any
  {
    try {
      const color = this.getBackgroundColor(value);
      return {"background-color" : color};
    } catch (exception)
    {
      return ""
    }
  }

  getBackgroundColor(stringInput: string) {
    if (stringInput.toLowerCase().startsWith('unknown')) return 'red';
    let stringUniqueHash = [...stringInput].reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return `hsl(${stringUniqueHash % 360}, 95%, 40%)`;
  }

  selectEntity(selectedEntity: Entity) {

    if (!this.replaceEntities.at(-1)!.oldEntity) {
      this.replaceEntities.at(-1)!.oldEntity = selectedEntity;
      this.availableEntities = this.entities.filter(entity => entity.entity_type == selectedEntity.entity_type);
      this.availableEntities.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
    }
    else {
      if (this.orphanEntities.includes(selectedEntity)) return;
      this.replaceEntities.at(-1)!.newEntity = selectedEntity;
    }
    this.cdr.detectChanges();
  }

  reset(item: {oldEntity: Entity | undefined, newEntity: Entity | undefined}) {
    item.oldEntity = undefined;
    item.newEntity = undefined;
    this.availableEntities = [...this.entities];
    this.availableEntities.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
    this.cdr.detectChanges();
  }


  replaceEntity(): any
  {
    const replaceEntities = this.replaceEntities;
    for (let item of replaceEntities) {
      if (!item.oldEntity || !item.newEntity) return;
    }
    const oldEntities = replaceEntities.map(item => item.oldEntity);
    const oldEntityIds: string[] = oldEntities.filter(entity=> entity!.entity_id != undefined).map(entity => entity!.entity_id!);
    this.remoteOperations = [];
    this.messages = [];
    if (this.replaceActivities)
    this.activities.forEach(activity => {
      if (activity.options?.included_entities?.find(entity => oldEntityIds.includes(entity.entity_id!)))
      {
        console.debug("Found activity to update", activity);
        let entity_ids: string[] = activity.options.included_entities
          .filter(entity => entity.entity_id && !oldEntityIds.includes(entity.entity_id!))
          .map(entity=> entity.entity_id!);

        replaceEntities.forEach(replaceEntity => {
          if (activity.options?.included_entities?.find(entity => entity.entity_id! === replaceEntity.oldEntity?.entity_id!))
            entity_ids.push(replaceEntity.newEntity!.entity_id!);
        })

        let sequences_list: {[p: string]: CommandSequence[]}  = {};
        ['on', 'off'].forEach(type => {
          if (activity?.options?.sequences?.[type])
          {
            let sequences = [...activity.options.sequences[type]];
            let finalsequences: CommandSequence[] = [];
            sequences.forEach(sequence => {
              const item = replaceEntities.find(entity => entity.oldEntity!.entity_id === sequence.command?.entity_id);
              if (item) {
                sequence.command!.entity_id = item.newEntity!.entity_id!;
                finalsequences.push(sequence);
              }
              else if (sequence.command?.entity_id && this.orphanEntities.find(entity =>
                entity.entity_id === sequence.command!.entity_id!))
              {
                console.warn("This entity is orphan in the sequence", sequence);
                this.messages.push({title: "This entity is orphan in the sequence",
                  message: `${sequence.command!.entity_id!}  will be removed from sequence in activity ${activity.name} (${activity.entity_id})`});
                this.cdr.detectChanges();
              }
              else
                finalsequences.push(sequence);
            });
            sequences_list[type] =  finalsequences;
          }
        })

        this.remoteOperations.push({name: `${activity.name}`,method: "PATCH", api: `/api/activities/${activity.entity_id}`,
          body: {
            options: {
              entity_ids,
              sequences: sequences_list
            }
          }, status: OperationStatus.Todo})

        activity.options?.button_mapping?.forEach(button => {
          let item = replaceEntities.find(entity => entity.oldEntity!.entity_id === button.short_press?.entity_id);
          if (item) {
            button.short_press!.entity_id = item.newEntity!.entity_id!;
            this.remoteOperations.push({name: `${activity.name} (buttons)`,method: "PATCH", api: `/api/activities/${activity.entity_id}/buttons/${button.button}`,
              body: {
                short_press: {...button.short_press}
              }, status: OperationStatus.Todo})
          }
          item = replaceEntities.find(entity => entity.oldEntity!.entity_id === button.long_press?.entity_id);
          if (item) {
            button.long_press!.entity_id = item.newEntity!.entity_id!;
            this.remoteOperations.push({name: `${activity.name} (buttons)`, method: "PATCH", api: `/api/activities/${activity.entity_id}/buttons/${button.button}`,
              body: {
                long_press: {...button.long_press}
              }, status: OperationStatus.Todo})
          }
          item = replaceEntities.find(entity => entity.oldEntity!.entity_id === button.double_press?.entity_id);
          if (item) {
            button.double_press!.entity_id = item.newEntity!.entity_id!;
            this.remoteOperations.push({name: `${activity.name} (buttons)`, method: "PATCH", api: `/api/activities/${activity.entity_id}/buttons/${button.button}`,
              body: {
                double_press: {...button.double_press}
              }, status: OperationStatus.Todo})
          }
        })

        activity.options?.user_interface?.pages?.forEach(page => {
          let found = false;
          page?.items?.forEach(item => {
            let entityItem = replaceEntities.find(entity => entity.oldEntity!.entity_id === item.command);
            // TODO should not happen
            if (entityItem) {
              item.command = entityItem.newEntity!.entity_id;
              found = true;
            }
            else if (item.command && (item.command as Command)?.entity_id) {
              entityItem = replaceEntities.find(entity => entity.oldEntity!.entity_id === (item.command as Command)?.entity_id);
              if (entityItem) {
                (item.command as Command).entity_id = entityItem.newEntity!.entity_id!;
                found = true;
              }
            }
            else if (item.media_player_id) {
              entityItem = replaceEntities.find(entity => entity.oldEntity!.entity_id === item.media_player_id);
              if (entityItem) {
                item.media_player_id = entityItem.newEntity!.entity_id!;
                found = true;
              }
            }
          })
          if (found)
          {
            // Check after orphans otherwise update will fail
            page?.items?.forEach(item => {
              if ((item.command as Command)?.entity_id && this.orphanEntities.find(entity =>
                entity.entity_id === (item.command as Command)!.entity_id!))
              {
                console.warn("This entity is orphan in the UI", item);
                this.messages.push({title: "This entity is orphan in the UI",
                  message: `${(item.command as Command)!.entity_id!}  will be removed from UI page ${page.name} in activity ${activity.name} (${activity.entity_id})`})
                delete item['command'];
                this.cdr.detectChanges();
              } else if (item.media_player_id && this.orphanEntities.find(entity =>
                entity.entity_id === item.media_player_id))
              {
                console.warn("This entity is orphan in the UI", item);
                this.messages.push({title: "This entity is orphan in the UI",
                  message: `${item.media_player_id}  will be removed from UI page ${page.name} in activity ${activity.name} (${activity.entity_id})`})
                delete item['media_player_id'];
                this.cdr.detectChanges();
              }
            })
            let method: "PUT" | "POST" | "DELETE" | "PATCH" = "PATCH";
            let api = `/api/activities/${activity.entity_id}/ui/pages/${page.page_id}`;

            this.remoteOperations.push({name: `${activity.name} (page ${page.name})`,method , api,
              body: {
                ...page
              }, status: OperationStatus.Todo})
          }
        });
      }

    });

    if (this.replaceProfiles)
    {
      this.profiles?.forEach(profile => {
        profile.pages?.forEach(page => {
          const items = page.items?.filter(item =>
            this.replaceEntities.find(entity => entity.oldEntity?.entity_id! === item.entity_id));
          if (!items || items.length == 0) return;
          const body = {
            items: [...page.items!]
          }
          body.items.forEach(item => {
            const entry = this.replaceEntities.find(entity =>
              entity.oldEntity!.entity_id === item.entity_id);
            if (!entry) return;
            item.entity_id = entry.newEntity?.entity_id!;
          });
          let method: "PUT" | "POST" | "DELETE" | "PATCH" = "PATCH";
          let api = `/api/profiles/${profile.profile_id}/pages/${page.page_id}`;
          this.remoteOperations.push({name: `Profile ${profile.name} (page ${page.name})`,method , api,
            body, status: OperationStatus.Todo})
        });

        profile.groups?.forEach(profileGroup => {
          if (!profileGroup.entities.find(entity_id =>
            this.replaceEntities.find(entity => entity.oldEntity?.entity_id! === entity_id)))
            return;
          const entity_ids = profileGroup.entities.map(entity_id => {
            const entry = this.replaceEntities.find(entity => entity.oldEntity?.entity_id! === entity_id);
            if (!entry) return entity_id;
            return entry.newEntity?.entity_id!;
          })
          const body = {
            entities: entity_ids
          }
          let method: "PUT" | "POST" | "DELETE" | "PATCH" = "PATCH";
          let api = `/api/profiles/${profile.profile_id}/groups/${profileGroup.group_id}`;
          this.remoteOperations.push({name: `Profile ${profile.name} (group ${profileGroup.name})`,method , api,
            body, status: OperationStatus.Todo})
        });
      });
    }

    if (this.replaceMacros)
    {
      this.macros.forEach(macro => {
        if (!macro.options?.included_entities?.find(entity =>
          this.replaceEntities.find(replaceEntity => replaceEntity.oldEntity?.entity_id! === entity.entity_id))
        && !macro.options?.sequence?.find(sequence =>
            this.replaceEntities.find(replaceEntity => replaceEntity.oldEntity?.entity_id! === sequence?.command?.entity_id)))
          return;
        const body: any = {
        };
        if (macro.options?.included_entities) {
          body.options.included_entities = macro.options.included_entities.map(entity_id => {
            const entry = this.replaceEntities.find(entity =>
              entity.oldEntity?.entity_id! === entity_id?.entity_id);
            if (!entry) return entity_id;
            return entry.newEntity?.entity_id!;
          });
        }
        if (macro.options?.sequence) {
          body.options.sequence = [...macro.options.sequence];
          (body.options.sequence as CommandSequence[]).forEach(sequence => {
            const entry = this.replaceEntities.find(entity =>
              entity.oldEntity?.entity_id! === sequence.command?.entity_id);
            if (entry && sequence.command) sequence.command.entity_id = entry.newEntity!.entity_id!;
          });
        }
        let method: "PUT" | "POST" | "DELETE" | "PATCH" = "PATCH";
        let api = `/api/macros/${macro.entity_id}`;
        this.remoteOperations.push({name: `Macro ${macro.name}`,method , api,
          body, status: OperationStatus.Todo})
      });
    }

    this.messageService.add({severity: "success", summary: `Operations are ready : ${this.remoteOperations.length} operations to execute`});
    this.operations!.visible = true;
    this.cdr.detectChanges();

  }

  invertEntities(item: {oldEntity: Entity | undefined, newEntity: Entity | undefined}) {
    let entity = item.oldEntity;
    item.oldEntity = item.newEntity;
    item.newEntity = entity;
    this.cdr.detectChanges();
  }

  add() {
    this.replaceEntities.push({oldEntity: undefined, newEntity: undefined});
    this.availableEntities = [...this.entities];
    this.availableEntities.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
    this.cdr.detectChanges();
  }

  remove()
  {
    this.replaceEntities.pop();
    if (this.replaceEntities.length > 0 && this.replaceEntities[-1].oldEntity)
    {
      this.availableEntities = this.entities.filter(entity =>
        entity.entity_type == this.replaceEntities[-1].oldEntity?.entity_type);
    }
    else
      this.availableEntities = [...this.entities];
    this.availableEntities.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
    this.cdr.detectChanges();
  }

  checkSelection(): boolean {
    for (let item of this.replaceEntities)
    {
      if (item.oldEntity == undefined || item.newEntity == undefined) return true;
    }
    return false;
  }

  protected readonly Helper = Helper;

  operationsDone($event: RemoteOperation[]) {
    this.remoteLoader?.load();
  }
}
