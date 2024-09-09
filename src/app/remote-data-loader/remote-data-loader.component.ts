import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation
} from '@angular/core';
import {NgIf} from "@angular/common";
import {ProgressSpinnerModule} from "primeng/progressspinner";
import {ToastModule} from "primeng/toast";
import {ProgressBarModule} from "primeng/progressbar";
import {catchError, forkJoin, from, map, mergeMap, Observable, of} from "rxjs";
import {ServerService} from "../server.service";
import {MessageService} from "primeng/api";
import {
  Activity,
  Context,
  Entity,
  EntityCommand,
  Macro,
  OrphanEntity,
  Profile,
  Remote,
  RemoteData
} from "../interfaces";
import {Helper} from "../helper";

@Component({
  selector: 'app-remote-data-loader',
  standalone: true,
  imports: [
    NgIf,
    ProgressSpinnerModule,
    ToastModule,
    ProgressBarModule
  ],
  templateUrl: './remote-data-loader.component.html',
  styleUrl: './remote-data-loader.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class RemoteDataLoaderComponent {

  protected readonly Math = Math;
  progress = false;
  remoteProgress = 0;
  progressDetail = "";
  @Input() remote: Remote | undefined;
  @Output() loaded = new EventEmitter<RemoteData | undefined>();
  activities: Activity[] = [];
  entities: Entity[] = [];
  profiles: Profile[] = [];
  macros: Macro[] = [];
  configCommands: EntityCommand[] = [];
  orphanEntities: OrphanEntity[] = [];
  unusedEntities: Entity[] = [];
  context: Context | undefined;
  localMode: boolean = false;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
  }

  load(): void
  {
    this.loadRemoteData().subscribe({next: results  => {
    }, error: err => {
        this.messageService.add({key: "remote-loader", severity:'error', summary:'Error during remote extraction'});
      }})
  }

  loadRemoteData(): Observable<RemoteData | undefined>
  {
    if (!this.remote)
    {
      this.messageService.add({key: "remote-loader", severity:'error', summary:'No remote selected'});
      this.cdr.detectChanges();
      this.loaded.emit(undefined);
      return of(undefined);
    }
    const remote = this.remote!;
    this.progress = true;
    this.remoteProgress = 0;
    this.cdr.detectChanges();
    const tasks: Observable<any>[] = [];
    tasks.push(this.server.getRemoteEntities(remote).pipe(
      catchError(error => {
        console.error("Error entities", error);
        throw error;
      }),
      map((entities) => {
        console.debug("Get remote entities", remote, entities);
        this.entities = entities;
        this.cdr.detectChanges();
        return entities;
      })));
    tasks.push(this.server.getRemoteActivities(remote).pipe(
      catchError(error => {
        console.error("Error activities", error);
        throw error;
      }),
      mergeMap((entities) => {
        console.debug("Get remote activities", remote, entities);
        this.activities = entities;
        this.messageService.add({key: "remote-loader", severity: "success", summary: `Remote data ${remote.address}`,
          detail: `${this.activities.length} activities extracted. Extracting details now...`});
        this.cdr.detectChanges();
        return from(this.activities).pipe(mergeMap(activity => {
          return this.server.getRemoteActivity(remote, activity.entity_id!).pipe(
            catchError(error => {
              console.error("Error activity", error);
              throw error;
            }),
            map(activityDetails => {
              // console.debug("Get remote activity details", remote, activityDetails);
              this.progressDetail = Helper.getEntityName(activity);
              const name = activity.name;
              Object.assign(activity, activityDetails);
              activity.name = name;
              if ((activityDetails as any).options?.included_entities)
                (activity as any).entities = (activityDetails as any).options.included_entities;
              this.remoteProgress += 100/this.activities.length;
              this.cdr.detectChanges();
              return activity;
            }))
        }, 2))
      })));
    tasks.push(this.server.getRemoteMacros(remote).pipe(
      catchError(error => {
        console.error("Error macros", error);
        throw error;
      }),
      map(macros => {
        console.debug("Get remote macros", remote, macros);
        this.macros = macros;
        this.cdr.detectChanges();
        return macros;
      })));
    tasks.push(this.server.getRemoteProfiles(remote).pipe(
      catchError(error => {
        console.error("Error profiles", error);
        throw error;
      }),
      map(profiles => {
        console.debug("Get remote profiles", remote, profiles);
        this.profiles = profiles;
        return profiles;
      })))
    tasks.push(this.server.getConfigEntityCommands(remote).pipe(
      catchError(error => {
        console.error("Error commands", error);
        throw error;
      }),
      map(commands => {
        console.debug("Get remote config entity commands", remote, commands);
        this.configCommands = commands;
      })))
    console.debug("Refresh tasks", tasks);
    return forkJoin(tasks).pipe(
      catchError(error => {
        console.error("Error during extraction", remote, error);
        this.progress = false;
        this.cdr.detectChanges();
        throw error;
      }),
      map(results => {
        console.log("Get remote data over", remote, results);
        this.unusedEntities = Helper.getUnusedEntities(this.activities, this.profiles, this.entities);
        this.orphanEntities = Helper.getOrphans(this.activities, this.entities);
        this.messageService.add({
          key: "remote-loader",
          severity: "success", summary: "Remote data loaded",
          detail: `${this.entities.length} entities and ${this.activities.length} activities extracted.`
        });
        this.context = {source: `${remote.remote_name} (${remote.address})`,
          date: new Date(), type: "Remote", remote_ip: remote.address, remote_name: remote.remote_name};
        localStorage.setItem("entities", JSON.stringify(this.entities));
        localStorage.setItem("activities", JSON.stringify(this.activities));
        localStorage.setItem("profiles", JSON.stringify(this.profiles));
        localStorage.setItem("configCommands", JSON.stringify(this.configCommands));
        localStorage.setItem("context", JSON.stringify(this.context));
        this.server.setActivities(this.activities);
        this.server.setEntities(this.entities);
        this.server.setProfiles(this.profiles);
        this.server.setConfigCommands(this.configCommands);
        this.localMode = true;
        this.progress = false;
        this.cdr.detectChanges();
        const data: RemoteData = {context: this.context, activities: this.activities, configCommands: this.configCommands, entities: this.entities,
          profiles: this.profiles, orphanEntities: this.orphanEntities, unusedEntities: this.unusedEntities, macros: this.macros};
        this.loaded.emit(data);
        return data;
      }))
  }


  reloadActivity(activity_id: string): Observable<Activity | undefined>
  {
    if (!this.remote)
    {
      this.messageService.add({key: "remote-loader", severity:'error', summary:'No remote selected'});
      this.cdr.detectChanges();
      this.loaded.emit(undefined);
      return of(undefined);
    }
    const remote = this.remote!;
    this.progress = true;
    this.remoteProgress = 0;
    this.cdr.detectChanges();
    const tasks: Observable<any>[] = [];

    tasks.push(this.server.getRemoteActivity(remote, activity_id).pipe(
    catchError(error => {
      console.error("Error activity", error);
      throw error;
    }),
    map(activityDetails => {
      // console.debug("Get remote activity details", remote, activityDetails);
      const activity = this.activities.find(activity => activity.entity_id === activity_id);
      if (activity) this.activities.splice(this.activities.indexOf(activity), 1);
      this.activities.push(activityDetails);
      activityDetails.name = Helper.getEntityName(activityDetails);
      this.cdr.detectChanges();
      return activityDetails;
    })));

    return forkJoin(tasks).pipe(
      catchError(error => {
        console.error("Error during extraction", remote, error);
        this.progress = false;
        this.cdr.detectChanges();
        throw error;
      }),
      map(results => {
        console.log("Get remote data over", remote, results);
        this.unusedEntities = Helper.getUnusedEntities(this.activities, this.profiles, this.entities);
        this.orphanEntities = Helper.getOrphans(this.activities, this.entities);
        this.messageService.add({
          key: "remote-loader",
          severity: "success", summary: "Remote data loaded",
          detail: `Activity reloaded`
        });
        localStorage.setItem("activities", JSON.stringify(this.activities));
        this.localMode = true;
        this.progress = false;
        this.cdr.detectChanges();
        const data: RemoteData = {context: this.context, activities: this.activities, configCommands: this.configCommands, entities: this.entities,
          profiles: this.profiles, orphanEntities: this.orphanEntities, unusedEntities: this.unusedEntities, macros: this.macros};
        this.loaded.emit(data);
        return this.activities.find(activity => activity.entity_id === activity_id);
      }))
  }
}
