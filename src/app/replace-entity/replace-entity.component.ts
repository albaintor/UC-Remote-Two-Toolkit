import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild} from '@angular/core';
import {Activity, Command, Config, Entity, OperationStatus, Profile, Remote, RemoteOperation} from "../interfaces";
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
import {ChipModule} from "primeng/chip";
import {TableModule} from "primeng/table";
import {EntityViewerComponent} from "../entity-viewer/entity-viewer.component";
import {ButtonModule} from "primeng/button";
import {RemoteOperationsComponent} from "../remote-operations/remote-operations.component";
import {forkJoin, from, map, mergeMap, Observable} from "rxjs";
import {MessagesModule} from "primeng/messages";

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
  ],
  templateUrl: './replace-entity.component.html',
  styleUrl: './replace-entity.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
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
  oldEntity: Entity | undefined;
  newEntity: Entity | undefined;
  profiles: Profile[] | undefined;
  localMode: boolean = false;

  @ViewChild(RemoteOperationsComponent) operations: RemoteOperationsComponent | undefined;

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
    if (entities || activities)
    {
      if (activities) this.activities = JSON.parse(activities);
      if (entities) this.entities = JSON.parse(entities);
      this.server.setEntities(this.entities);
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
        this.messageService.add({
          severity: "success", summary: "Remote data loaded",
          detail: `${this.entities.length} entities and ${this.activities.length} activities extracted.`
        });
        localStorage.setItem("entities", JSON.stringify(this.entities));
        localStorage.setItem("activities", JSON.stringify(this.activities));
        localStorage.setItem("profiles", JSON.stringify(this.profiles));
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

  selectEntity(entity: Entity) {
    if (!this.oldEntity)
      this.oldEntity = entity;
    else
      this.newEntity = entity;
    this.cdr.detectChanges();
  }

  reset() {
    this.oldEntity = undefined;
    this.newEntity = undefined;
    this.cdr.detectChanges();
  }


  replaceEntity(oldEntity: Entity, newEntity: Entity): any
  {
    if (!oldEntity || !newEntity || !oldEntity.entity_id || !newEntity.entity_id) return;
    this.remoteOperations = [];
    this.activities.forEach(activity => {
      if (activity.options?.included_entities?.find(entity => entity.entity_id === oldEntity?.entity_id!))
      {
        console.debug("Found activity to update", activity);
        let entity_ids: string[] = activity.options.included_entities
          .filter(entity => entity.entity_id && entity.entity_id !== oldEntity.entity_id)
          .map(entity=> entity.entity_id!);
        if (!entity_ids.includes(newEntity.entity_id!))
          entity_ids.push(newEntity.entity_id!);
        let sequences_list = new Map<string, any>();
        ['on', 'off'].forEach(type => {
          if (activity?.options?.sequences?.[type])
          {
            let sequences = [...activity.options.sequences[type]];
            sequences_list.set(type, sequences);
            sequences.forEach(sequence => {
              if (sequence.command?.entity_id === oldEntity.entity_id)
                sequence.command!.entity_id = newEntity.entity_id!;
            })
          }
        })

        this.remoteOperations.push({method: "PATCH", api: `/api/activities/${activity.entity_id}`,
          body: {
            options: {
              entity_ids,
              sequences: sequences_list
            }
          }, status: OperationStatus.Todo})

        activity.options?.button_mapping?.forEach(button => {
          if (button.short_press?.entity_id === oldEntity.entity_id) {
            button.short_press!.entity_id = newEntity.entity_id!;
            this.remoteOperations.push({method: "PATCH", api: `/api/activities/${activity.entity_id}/buttons/${button.button}`,
              body: {
                short_press: {...button.short_press}
              }, status: OperationStatus.Todo})
          }
          if (button.long_press?.entity_id === oldEntity.entity_id) {
            button.long_press!.entity_id = newEntity.entity_id!;
            this.remoteOperations.push({method: "PATCH", api: `/api/activities/${activity.entity_id}/buttons/${button.button}`,
              body: {
                long_press: {...button.long_press}
              }, status: OperationStatus.Todo})
          }
        })

        activity.options?.user_interface?.pages?.forEach(page => {
          let found = false;
          page?.items?.forEach(item => {
            // TODO should not happen
            if (item.command && typeof item.command === "string" && (item.command as string) === oldEntity.entity_id) {
              item.command = newEntity.entity_id;
              found = true;
            }
            else if (item.command && (item.command as Command)?.entity_id === oldEntity.entity_id) {
              (item.command as Command).entity_id = newEntity.entity_id!;
              found = true;
            }
            if (item.media_player_id === oldEntity.entity_id) {
              item.media_player_id = newEntity.entity_id;
              found = true;
            }
          })
          if (found)
          {
            let method: "PUT" | "POST" | "DELETE" | "PATCH" = "PATCH";
            let api = `/api/activities/${activity.entity_id}/ui/pages/${page.page_id}`;

            this.remoteOperations.push({method , api,
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

  invertEntities() {
    let entity = this.oldEntity;
    this.oldEntity = this.newEntity;
    this.newEntity = entity;
    this.cdr.detectChanges();
  }
}