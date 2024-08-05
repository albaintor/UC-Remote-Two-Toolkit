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
  ActivitySequence,
  Command,
  Config,
  Context,
  Entity,
  OperationStatus,
  Profile,
  Remote,
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
import {EntityViewerComponent} from "../entity-viewer/entity-viewer.component";
import {ButtonModule} from "primeng/button";
import {RemoteOperationsComponent} from "../remote-operations/remote-operations.component";
import {forkJoin, from, map, mergeMap, Observable} from "rxjs";
import {MessagesModule} from "primeng/messages";
import {MultiSelectModule} from "primeng/multiselect";

class Message {
  title: string = "";
  message: string = "";
}

interface OrphanEntity extends Entity
{
  activities?: Activity[];
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
    {label: 'Load Remote data', command: () => this.loadRemoteData(), icon: 'pi pi-history', block: true},
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

  @ViewChild(RemoteOperationsComponent) operations: RemoteOperationsComponent | undefined;
  context: Context | undefined;
  availableEntities: Entity[] = [];

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService,
              private activatedRoute: ActivatedRoute) {

  }

  ngOnInit(): void {
    this.initMenu();
    this.server.getConfig().subscribe(config => {
      this.updateRemote(config);
      this.server.config$.subscribe(config => {
        this.updateRemote(config);
      })
    })
    const entities = localStorage.getItem("entities");
    const activities = localStorage.getItem("activities");
    const orphans = localStorage.getItem("orphans");
    const context = localStorage.getItem("context");
    if (entities || activities || orphans)
    {
      if (activities) this.activities = JSON.parse(activities);
      if (entities) {
        this.entities = JSON.parse(entities);
        this.availableEntities = [...this.entities];
      }
      if (orphans) this.orphanEntities = JSON.parse(orphans);
      if (context) this.context = JSON.parse(context);
      this.server.setEntities(this.entities);
      this.getOrphans();
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

  getEntityName(entity:Entity): string
  {
    if (!entity || !entity.name) return "";
    if (typeof entity.name === 'string')
      return entity.name;
    if (entity.name?.en)
      return entity.name.en;
    return "";
  }

  getOrphans()
  {
    // Add orphan entities
    this.orphanEntities = [];
    this.activities.forEach(activity => {
      activity.options?.included_entities?.forEach(include_entity => {
        if (!this.entities.find(entity => entity.entity_id == include_entity.entity_id)) {
          this.entities.push(include_entity);
          let orphanEntity = this.orphanEntities.find(
            orphanEntity => orphanEntity.entity_id == include_entity.entity_id);
          if (!orphanEntity) {
            orphanEntity = {...include_entity, activities: [activity]};
            this.orphanEntities.push(orphanEntity);
          }
          else
            orphanEntity.activities?.push(activity)
        }
      })
    })
  }

  loadRemoteData():void
  {
    if (!this.selectedRemote)
    {
      this.messageService.add({severity:'error', summary:'No remote selected'});
      this.cdr.detectChanges();
      return;
    }
    this.progress = true;
    this.remoteProgress = 0;
    // this.items.filter(item => (item as any).block == true).forEach(item => item.disabled = true);
    this.entities = [];
    this.activities = [];
    this.profiles = [];
    this.orphanEntities = [];
    this.cdr.detectChanges();
    const tasks: Observable<any>[] = [];
    tasks.push(this.server.getRemoteEntities(this.selectedRemote).pipe(map((entities) => {
      this.entities = entities;
      // this.messageService.add({severity: "success", summary: `Remote data ${this.selectedRemote?.address}`,
      //   detail: `${this.entity_list.length} entities extracted`});
      this.cdr.detectChanges();
      return entities;
    })));
    tasks.push(this.server.getRemoteActivities(this.selectedRemote!).pipe(mergeMap((entities) => {
      this.activities = entities;
      this.messageService.add({severity: "success", summary: `Remote data ${this.selectedRemote?.address}`,
        detail: `${this.activities.length} activities extracted. Extracting details now...`});
      this.cdr.detectChanges();
      return from(this.activities).pipe(mergeMap(activity => {
        return this.server.getRemoteActivity(this.selectedRemote!, activity.entity_id!).pipe(map(activityDetails => {
          this.progressDetail = activity.name;
          const name = activity.name;
          Object.assign(activity, activityDetails);
          activity.name = name;
          if ((activityDetails as any).options?.included_entities)
            (activity as any).entities = (activityDetails as any).options.included_entities;
          this.remoteProgress += 100/this.activities.length;
          this.cdr.detectChanges();
          console.log("Activity", activity);
          return activity;
        }))
      }))
    })));
    tasks.push(this.server.getRemoteProfiles(this.selectedRemote).pipe(map(profiles => {
      this.profiles = profiles;
      console.log("Profiles", profiles);
      return profiles;
    })))

    forkJoin(tasks).subscribe({next: (results) => {
      // Add orphan entities
        this.getOrphans();
        this.availableEntities = [...this.entities];
        this.messageService.add({
          severity: "success", summary: "Remote data loaded",
          detail: `${this.entities.length} entities and ${this.activities.length} activities extracted.`
        });
        this.context = {source: `${this.selectedRemote?.remote_name} (${this.selectedRemote?.address})`,
          date: new Date(), type: "Remote", remote_ip: this.selectedRemote?.address, remote_name: this.selectedRemote?.remote_name};
        localStorage.setItem("entities", JSON.stringify(this.entities));
        localStorage.setItem("activities", JSON.stringify(this.activities));
        localStorage.setItem("profiles", JSON.stringify(this.profiles));
        localStorage.setItem("orphans", JSON.stringify(this.orphanEntities));
        localStorage.setItem("context", JSON.stringify(this.context));
        this.localMode = true;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.messageService.add({
          severity: "error", summary: "Error during remote data extraction"
        });
        this.cdr.detectChanges();
      },
      complete: () => {
        // this.items.filter(item => (item as any).block == true).forEach(item => item.disabled = false);
        this.progress = false;
        this.cdr.detectChanges();
      }})
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
    }
    else
      this.replaceEntities.at(-1)!.newEntity = selectedEntity;
    this.cdr.detectChanges();
  }

  reset(item: {oldEntity: Entity | undefined, newEntity: Entity | undefined}) {
    item.oldEntity = undefined;
    item.newEntity = undefined;
    this.availableEntities = [...this.entities];
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

        let sequences_list: {[p: string]: ActivitySequence[]}  = {};
        ['on', 'off'].forEach(type => {
          if (activity?.options?.sequences?.[type])
          {
            let sequences = [...activity.options.sequences[type]];
            let finalsequences: ActivitySequence[] = [];
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
    this.cdr.detectChanges();
  }

  checkSelection(): boolean {
    for (let item of this.replaceEntities)
    {
      if (item.oldEntity == undefined || item.newEntity == undefined) return true;
    }
    return false;
  }

  getValues(table: any[], field_name: string) {
    const values = new Set<any>();
    table.forEach(item => {
      if (item?.[field_name]) {
        values.add(item?.[field_name])
      }
    });
    return Array.from(values).sort();
  }

  getItems(table: any[], field_name: string) {
    return this.getValues(table, field_name).map(value => {
      return {name: value.toString(), value}
    });
  }
}
