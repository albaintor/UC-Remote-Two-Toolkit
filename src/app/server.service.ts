import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import {BehaviorSubject, forkJoin, from, map, mergeMap, Observable, of, Subject} from "rxjs";
import {
  Activity, BatteryState, Command,
  Config,
  Context, Driver,
  Entity, EntityCommand, EntityFeature,
  Integration, Macro, Page, Profile, ProfileGroup,
  Profiles,
  Remote, RemoteMap, RemoteModels, RemoteRegistration, RemoteStatus, RemoteVersion, ScreenLayout
} from "./interfaces";
import { DomHandler } from 'primeng/dom';

@Injectable({
  providedIn: 'root'
})
export class ServerService {

  API_KEY_NAME = "UCWebTool";
  config$ = new Subject<Config>();
  remote$ = new Subject<Remote>();
  config: Config | undefined;
  private entities: Entity[] = [];
  private activities: Activity[] = [];
  private profiles: Profile[] = [];
  version$ = new Subject<RemoteVersion | undefined>();
  entities$ = new Subject<Entity[]>();
  activities$ = new Subject<Activity[]>();
  profiles$: Subject<Profile[]> = new Subject<Profile[]>();
  configCommands$ = new BehaviorSubject<EntityCommand[]>([]);

  constructor(private http: HttpClient) {
    // PrimeNG bug
    DomHandler.getParents = function (element, parents = []) {
      const parent = element.parentElement;
      return parent ? this.getParents(parent, [...parents, parent]) : parents;
    };
  }

  static getHttpOptions(remote: Remote, url: string): { headers: HttpHeaders } {
    let authKey;
    if (remote.api_key)
      authKey = `Bearer ${remote.api_key}`;
    else
      authKey = `Basic ${btoa(remote.user + ':' + remote.token)}`;
    return {
      headers: new HttpHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json',
        'Authorization': authKey,
        'destinationurl': `${remote.address}:${remote.port}${url}`
      })
    };
  }

  getCachedEntities(): Entity[] {
    return this.entities;
  }

  getCachedActivities(): Activity[] {
    return this.activities;
  }

  getCachedProfiles(): Profile[] {
    return this.profiles;
  }

  setEntities(entities: Entity[]): void {
    this.entities = entities;
    this.entities$.next(entities);
  }

  setActivities(activities: Activity[]): void {
    this.activities = activities;
    this.activities$.next(activities);
  }

  setConfigCommands(configCommands: EntityCommand[]) {
    this.configCommands$.next(configCommands);
  }

  setProfiles(profiles: Profile[]): void {
    this.profiles = profiles;
    this.profiles$.next(profiles);
  }

  setVersion(version: RemoteVersion | undefined) {
    this.version$.next(version);
  }

  getPictureRemoteMap(): Observable<{ [id: string]: string }>
  {
    return this.http.get<{ [id: string]: string }>('/assets/remote/picture-button-map.json').pipe(map(results => {
      return results;
    }))
  }

  getRemoteModels(): Observable<RemoteModels>
  {
    return this.http.get<RemoteModels>('/assets/remote/remote-models.json').pipe(map(results => {
      return results;
    }))
  }

  getTemplateRemoteMap(): Observable<RemoteMap[]>
  {
    return this.http.get<RemoteMap[]>('/assets/remote/remote-map.json').pipe(map(results => {
      return results;
    }))
  }

  getFeaturesMap(): Observable<EntityFeature[]>
  {
    return this.http.get<EntityFeature[]>('/assets/remote/features-map.json').pipe(map(results => {
      return results;
    }))
  }

  getConfig(): Observable<Config>
  {
    return this.http.get<Config>('/api/config').pipe(map(results => {
      if (!results.language) results.language = 'fr';
      this.config = results;
      this.config$.next(this.config);
      return this.config;
    }))
  }

  getRemoteKey(remote: Remote): Observable<string>
  {
    return this.http.get<string>(`/api/config/remote/${remote.address}/key`).pipe(map(results => {
      return results;
    }))
  }


  getRemoteBattery(remote: Remote): Observable<BatteryState>
  {
    return this.http.get<BatteryState>(`/api/remote/${remote.address}/system/power/battery`).pipe(map(results => {
      return results;
    }))
  }


  // setConfig(config: Config): Observable<any>
  // {
  //   return this.http.post<Config>('/api/config', config).pipe(map(results => {
  //     return results;
  //   }))
  // }

  loadResources(remote: Remote, type: string): Observable<any>
  {
    return this.http.get<any>(`/api/remote/${remote.address}/resources/${type}`).pipe(map(results => {
      return results;
    }))
  }

  getResources(remote: Remote, type: string): Observable<string[]>
  {
    return this.http.get<string[]>(`/api/remote/${remote.address}/local/resources/${type}`).pipe(map(results => {
      return results;
    }))
  }

  getConfigEntityCommands(remote: Remote): Observable<EntityCommand[]>
  {
    return this.http.get<EntityCommand[]>(`/api/remote/${remote.address}/cfg/entity/commands`).pipe(map(results => {
      this.configCommands$.next(results);
      return results;
    }))
  }

  getConfigScreenLayout(remote: Remote): Observable<ScreenLayout>
  {
    return this.http.get<ScreenLayout>(`/api/remote/${remote.address}/cfg/device/screen_layout`).pipe(map(results => {
      return results;
    }))
  }

  // getResource(remote: Remote, type: string, id: string): Observable<any>
  // {
  //   return this.http.get<any>(`/api/remote/${remote.address}/resources/${type}/${id}`).pipe(map(results => {
  //     return results;
  //   }))
  // }

  getObjectName(object: any): string
  {
    if (typeof object.name === 'string') return object.name;
    let name  = object.name[this.config!.language];
    if (name) return name;
    return object.name['en'];
  }

  getRemoteIntegrationEntities(remote: Remote, integrationId: string, filter : "NEW"|"CONFIGURED"|"ALL" = "NEW"): Observable<Entity[]>
  {
    const httpOptions = {params: new HttpParams({fromObject: {filter}})};
    return this.http.get<Entity[]>(`/api/remote/${remote.address}/intg/instances/${integrationId}/entities`, httpOptions).pipe(map(entities => {
      entities.forEach(entity => {
        entity.name = this.getObjectName(entity);
      })
      this.entities = entities;
      return entities;
    }))
  }

  getRemoteEntities(remote: Remote): Observable<Entity[]>
  {
    return this.http.get<Entity[]>(`/api/remote/${remote.address}/entities`).pipe(map(entities => {
      entities.forEach(entity => {
        entity.name = this.getObjectName(entity);
      })
      this.entities = entities;
      return entities;
    }))
  }

  getRemotetEntity(remote: Remote, entityId: string): Observable<Entity>
  {
    return this.http.get<Entity>(`/api/remote/${remote.address}/entities/${entityId}`).pipe(map(results => {
      return results;
    }))
  }

  getRemoteActivities(remote: Remote): Observable<Activity[]>
  {
    return this.http.get<Activity[]>(`/api/remote/${remote.address}/activities`).pipe(map(activities => {
      activities.forEach(entity => {
        entity.name = this.getObjectName(entity);
      })
      this.activities = activities;
      return activities;
    }))
  }

  getRemoteActivity(remote: Remote, activity_id: string): Observable<Activity>
  {
    return this.http.get<Activity>(`/api/remote/${remote.address}/activities/${activity_id}`).pipe(map(results => {
      return results;
    }))
  }

  deleteRemoteActivity(remote: Remote, activity_id: string): Observable<any>
  {
    return this.http.delete<any>(`/api/remote/${remote.address}/activities/${activity_id}`).pipe(map(results => {
      return results;
    }))
  }

  deleteRemoteEntity(remote: Remote, entity_id: string): Observable<any>
  {
    return this.http.delete<any>(`/api/remote/${remote.address}/entities/${entity_id}`).pipe(map(results => {
      return results;
    }))
  }

  deleteRemoteActivityPage(remote: Remote, activity_id: string, page_id: string): Observable<any>
  {
    return this.http.delete<any>(`/api/remote/${remote.address}/activities/${activity_id}/ui/pages/${page_id}`).pipe(map(results => {
      return results;
    }))
  }

  getRemoteIntegrations(remote: Remote): Observable<Integration[]>
  {
    return this.http.get<Integration[]>(`/api/remote/${remote.address}/intg/instances`).pipe(map(results => {
      return results;
    }))
  }

  getRemoteDrivers(remote: Remote): Observable<Driver[]>
  {
    return this.http.get<Driver[]>(`/api/remote/${remote.address}/intg/drivers`).pipe(map(results => {
      return results;
    }))
  }

  deleteRemoteDriver(remote: Remote, driverId: string): Observable<any>
  {
    return this.http.delete<any>(`/api/remote/${remote.address}/intg/drivers/${driverId}`).pipe(map(results => {
      return results;
    }))
  }

  deleteRemoteIntegration(remote: Remote, integrationId: string): Observable<any>
  {
    return this.http.delete<any>(`/api/remote/${remote.address}/intg/instances/${integrationId}`).pipe(map(results => {
      return results;
    }))
  }

  getRemoteProfiles(remote: Remote): Observable<Profile[]>
  {
    const profiles: Profile[] = [];
    let obs = this.http.get<Profile[]>(`/api/remote/${remote.address}/profiles`).pipe(
      mergeMap(profiles => {
      return from(profiles);
    }),
      mergeMap(profile => {
        return forkJoin([
          this.http.get<Page[]>(`/api/remote/${remote.address}/profiles/${profile.profile_id}/pages`).pipe(map(pages => {
            profile.pages = pages;
          })),
          this.http.get<ProfileGroup[]>(`/api/remote/${remote.address}/profiles/${profile.profile_id}/groups`).pipe(map(groups => {
            profile.groups = groups;
          })),
        ]).pipe(map(groups => {
          return profile;
        }))
      }),
      map(profileData => {
        profiles.push(profileData);
        return profileData;
      }))
    return forkJoin([obs]).pipe(map(results => {
      this.profiles = profiles;
      this.profiles$.next(profiles);
      return results;
    }))
  }

  getRemoteMacros(remote: Remote): Observable<Macro[]>
  {
    return this.http.get<Macro[]>(`/api/remote/${remote.address}/macros`).pipe(mergeMap(macros => {
      if (macros.length == 0) return of(macros);
      return forkJoin([from(macros).pipe(mergeMap(macro => {
        return this.http.get<Macro>(`/api/remote/${remote.address}/macros/${macro.entity_id}`);
      }))]).pipe(map(macros => {
        console.debug("Retrieved all macros", macros);
        return macros;
      }))
    }));
  }

  executeRemotetCommand(remote: Remote, command: Command): Observable<{code: string, message: string}>
  {
    const body: any = {
      entity_id: command.entity_id,
      cmd_id: command.cmd_id
    }
    if (command.params)
      body.params = {...command.params};

    return this.http.put<{code: string, message: string}>(`/api/remote/${remote.address}/entities/${command.entity_id}/command`, body).pipe(map(results => {
      return results;
    }))
  }

  registerRemote(remote: Remote): Observable<Remote>
  {
    return this.http.post<any>('/api/config/remote', remote).pipe(map(results => {
      return results;
    }))
  }

  wakeRemote(remote: Remote, broadcast?: string): Observable<any>
  {
    const body: any = {}
    if (broadcast) {
      let httpOptions = {params: new HttpParams({fromObject: {broadcast}})};
      return this.http.post<any>(`/api/remote/${remote.address}/wake`, body, httpOptions).pipe(map(results => {
        return results;
      }))
    }
    else
      return this.http.post<any>(`/api/remote/${remote.address}/wake`, body).pipe(map(results => {
        return results;
      }))
  }

  unregisterRemote(remote: Remote): Observable<any>
  {
    return this.http.delete<any>('/api/config/remote/'+remote.address).pipe(map(results => {
      return results;
    }))
  }

  getRemoteRegistrations(remote: Remote): Observable<RemoteRegistration[]>
  {
    return this.http.get<RemoteRegistration[]>('/api/config/remote/'+remote.address).pipe(map(results => {
      return results;
    }))
  }

  getRemoteVersion(remote: Remote): Observable<RemoteVersion>
  {
    return this.http.get<RemoteVersion>(`/api/remote/${remote.address}/version`).pipe(map(results => {
      return results;
    }))
  }

  getRemoteStatus(remote: Remote): Observable<RemoteStatus>
  {
    return this.http.get<RemoteStatus>(`/api/remote/${remote.address}/pub/status`).pipe(map(results => {
      return results;
    }))
  }

  getRemoteBackup(remote:Remote)
  {
    return this.http.get<any>(`/api/remote/${remote.address}/system/backup/export`,
      {responseType: 'blob' as 'json'});//, {responseType: "application/octet-stream" });
  }

  powerRemote(remote: Remote, value: "STANDBY"|"REBOOT"|"POWER_OFF"|"RESTART"|"RESTART_UI"|"RESTART_CORE"): Observable<any>
  {
    const httpOptions = {params: new HttpParams({fromObject: {"cmd": value}})};
    return this.http.post<any>(`/api/remote/${remote.address}/system`, {}, httpOptions).pipe(map(results => {
      return results;
    }))
  }

  remoteGet(remote: Remote, url: string,
            params?:{[param: string]: string | number | boolean | ReadonlyArray<string | number | boolean>}): Observable<any>
  {
    const httpOptions: {headers: HttpHeaders, params?: HttpParams} = ServerService.getHttpOptions(remote, url);
    if (params)
      httpOptions['params'] = new HttpParams({fromObject: params});
    return this.http.get<any>('/server/api',httpOptions).pipe(map(results => {
      return results;
    }))
  }

  remotePost(remote: Remote, url: string, data: any,
            params?:{[param: string]: string | number | boolean | ReadonlyArray<string | number | boolean>}): Observable<any>
  {
    const httpOptions: {headers: HttpHeaders, params?: HttpParams} = ServerService.getHttpOptions(remote, url);
    if (params)
      httpOptions['params'] = new HttpParams({fromObject: params});
    return this.http.post<any>('/server/api',data, httpOptions).pipe(map(results => {
      return results;
    }))
  }

  remotePut(remote: Remote, url: string, data: any,
             params?:{[param: string]: string | number | boolean | ReadonlyArray<string | number | boolean>}): Observable<any>
  {
    const httpOptions: {headers: HttpHeaders, params?: HttpParams} = ServerService.getHttpOptions(remote, url);
    if (params)
      httpOptions['params'] = new HttpParams({fromObject: params});
    return this.http.put<any>('/server/api',data, httpOptions).pipe(map(results => {
      return results;
    }))
  }

  remoteDelete(remote: Remote, url: string,
            params?:{[param: string]: string | number | boolean | ReadonlyArray<string | number | boolean>}): Observable<any>
  {
    const httpOptions: {headers: HttpHeaders, params?: HttpParams} = ServerService.getHttpOptions(remote, url);
    if (params)
      httpOptions['params'] = new HttpParams({fromObject: params});
    return this.http.delete<any>('/server/api',httpOptions).pipe(map(results => {
      return results;
    }))
  }

  remotePatch(remote: Remote, url: string, data: any,
               params?:{[param: string]: string | number | boolean | ReadonlyArray<string | number | boolean>}): Observable<any>
  {
    const httpOptions: {headers: HttpHeaders, params?: HttpParams} = ServerService.getHttpOptions(remote, url);
    if (params)
      httpOptions['params'] = new HttpParams({fromObject: params});
    return this.http.patch<any>('/server/api', data, httpOptions).pipe(map(results => {
      return results;
    }))
  }


  getContext(): Observable<Context>
  {
    return this.http.get<Context>('/api/context').pipe(map(results => {
      return results;
    }))
  }

  getBackup(url: string): Observable<any>
  {
    return this.http.get<any>('/download/'+url, {responseType: 'blob' as 'json'})
  }

  getActivitiesFromBackup(): Observable<Activity[]>
  {
    return this.http.get<Activity[]>('/api/activities').pipe(map(results => {
      return results;
    }))
  }

  getEntitiesFromBackup(): Observable<Entity[]>
  {
    return this.http.get<Entity[]>('/api/entities').pipe(map(results => {
      return results;
    }))
  }

  getProfilesFromBackup(): Observable<Profiles>
  {
    return this.http.get<Profiles>('/api/profiles').pipe(map(results => {
      return results;
    }))
  }

  findEntities(query: string): Observable<Entity[]>
  {
    return this.http.get<Entity[]>('/api/entity/'+query).pipe(map(results => {
      return results;
    }))
  }

  getUploadedFiles(): Observable<string[]>
  {
    return this.http.get<string[]>('/api/uploaded_files').pipe(map(results => {
      return results;
    }))
  }

  deleteUploadedFile(fileName: string): Observable<any>
  {
    return this.http.delete<any>('/api/uploaded_files/'+fileName).pipe(map(results => {
      return results;
    }))
  }

  loadFile(fileName: string): Observable<any>
  {
    return this.http.post<any>('/api/load/path/'+fileName, {}, {}).pipe(map(results => {
      return results;
    }))
  }

  upload(formData: any) {
    return this.http.post<any>('/upload', formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  getUCIconsMap(): Observable<{name: string, icon: string}[]>
  {
    return this.http.get<{name: string, icon: string}[]>('/assets/icons/uc-icons.json').pipe(map(results => {
      return results;
    }))
  }
}
