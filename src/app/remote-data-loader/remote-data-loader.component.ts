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
import {Activity, Context, Entity, EntityCommand, OrphanEntity, Profile, Remote} from "../interfaces";
import {Helper} from "../helper";

export interface RemoteData {
  activities: Activity[]
  entities: Entity[]
  profiles: Profile[]
  configCommands: EntityCommand[]
  orphanEntities: OrphanEntity[]
  unusedEntities: Entity[]
  context: Context | undefined;
}

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
    this.progress = true;
    this.remoteProgress = 0;
    this.cdr.detectChanges();
    const tasks: Observable<any>[] = [];
    tasks.push(this.server.getRemoteEntities(this.remote).pipe(map((entities) => {
      this.entities = entities;
      this.cdr.detectChanges();
      return entities;
    })));
    tasks.push(this.server.getRemoteActivities(this.remote!).pipe(mergeMap((entities) => {
      this.activities = entities;
      this.messageService.add({key: "remote-loader", severity: "success", summary: `Remote data ${this.remote?.address}`,
        detail: `${this.activities.length} activities extracted. Extracting details now...`});
      this.cdr.detectChanges();
      return from(this.activities).pipe(mergeMap(activity => {
        return this.server.getRemoteActivity(this.remote!, activity.entity_id!).pipe(map(activityDetails => {
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
    tasks.push(this.server.getRemoteProfiles(this.remote).pipe(map(profiles => {
      this.profiles = profiles;
      console.log("Profiles", profiles);
      return profiles;
    })))
    tasks.push(this.server.getConfigEntityCommands(this.remote).pipe(map(commands => {
      this.configCommands = commands;
    })))

    return forkJoin(tasks).pipe(
      catchError(error => {
        this.progress = false;
        throw error;
      }),
      map(results => {
        this.unusedEntities = Helper.getUnusedEntities(this.activities, this.profiles, this.entities);
        this.orphanEntities = Helper.getOrphans(this.activities, this.entities);
        this.messageService.add({
          key: "remote-loader",
          severity: "success", summary: "Remote data loaded",
          detail: `${this.entities.length} entities and ${this.activities.length} activities extracted.`
        });
        this.context = {source: `${this.remote?.remote_name} (${this.remote?.address})`,
          date: new Date(), type: "Remote", remote_ip: this.remote?.address, remote_name: this.remote?.remote_name};
        localStorage.setItem("entities", JSON.stringify(this.entities));
        localStorage.setItem("activities", JSON.stringify(this.activities));
        localStorage.setItem("profiles", JSON.stringify(this.profiles));
        localStorage.setItem("configCommands", JSON.stringify(this.configCommands));
        localStorage.setItem("context", JSON.stringify(this.context));
        this.localMode = true;
        this.progress = false;
        this.cdr.detectChanges();
        const data: RemoteData = {context: this.context, activities: this.activities, configCommands: this.configCommands, entities: this.entities,
        profiles: this.profiles, orphanEntities: this.orphanEntities, unusedEntities: this.unusedEntities};
        this.loaded.emit(data);
        return data;
      }))
  }
}
