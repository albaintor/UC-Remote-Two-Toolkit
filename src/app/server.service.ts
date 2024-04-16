import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from "@angular/common/http";
import {map, Observable, Subject} from "rxjs";
import {
  Activities, Activity,
  Config,
  Context,
  Entities,
  EntitiesUsage,
  Entity,
  EntityUsage,
  Profiles,
  Remote
} from "./interfaces";

@Injectable({
  providedIn: 'root'
})
export class ServerService {

  API_KEY_NAME = "RC2Tool";
  config$ = new Subject<Config>();
  remote$ = new Subject<Remote>();
  config: Config | undefined;

  constructor(private http: HttpClient) { }

  static getHttpOptions(remote: Remote, url: string) : {headers: HttpHeaders}
  {
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
        'destinationurl': remote.address + url
      })
    };
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

  setConfig(config: Config): Observable<any>
  {
    return this.http.post<Config>('/api/config', config).pipe(map(results => {
      return results;
    }))
  }

  getObjectName(object: any): string
  {
    if (typeof object.name === 'string') return object.name;
    let name  = object.name[this.config!.language];
    if (name) return name;
    return object.name['en'];
  }

  getRemoteEntities(remote: Remote): Observable<Entity[]>
  {
    return this.http.get<Entity[]>(`/api/remote/${remote.address}/entities`).pipe(map(results => {
      results.forEach(entity => {
        entity.name = this.getObjectName(entity);
      })
      return results;
    }))
  }

  getRemoteActivities(remote: Remote): Observable<Activity[]>
  {
    return this.http.get<Activity[]>(`/api/remote/${remote.address}/activities`).pipe(map(results => {
      results.forEach(entity => {
        if (!entity.activity_id) entity.activity_id = entity.entity_id;
        if (!entity.entity_id) entity.entity_id = entity.activity_id;
        entity.name = this.getObjectName(entity);
      })
      return results;
    }))
  }

  getRemoteActivity(remote: Remote, activity_id: string): Observable<Activity>
  {
    return this.http.get<Activity>(`/api/remote/${remote.address}/activities/${activity_id}`).pipe(map(results => {
      return results;
    }))
  }

  registerRemote(remote: Remote): Observable<Remote>
  {
    return this.http.post<any>('/api/config/remote', remote).pipe(map(results => {
      return results;
    }))
  }

  unregisterRemote(remote: Remote): Observable<any>
  {
    return this.http.delete<any>('/api/config/remote/'+remote.address).pipe(map(results => {
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

  getContext(): Observable<Context>
  {
    return this.http.get<Context>('/api/context').pipe(map(results => {
      return results;
    }))
  }

  getBackup(url: string): Observable<any>
  {
    return this.http.get<any>('/download/'+url, {responseType: 'blob' as 'json'}).pipe(map(results => {
      return results;
    }))
  }

  getActivities(): Observable<Activities>
  {
    return this.http.get<Activities>('/api/activities').pipe(map(results => {
      return results;
    }))
  }

  getEntities(): Observable<Entities>
  {
    return this.http.get<Entities>('/api/entities').pipe(map(results => {
      return results;
    }))
  }

  getProfiles(): Observable<Profiles>
  {
    return this.http.get<Profiles>('/api/profiles').pipe(map(results => {
      return results;
    }))
  }

  getOrphans(): Observable<any>
  {
    return this.http.get<any>('/api/orphans').pipe(map(results => {
      return results;
    }))
  }
  getEntity(query: string): Observable<Entities>
  {
    return this.http.get<Entities>('/api/entity/'+query).pipe(map(results => {
      return results;
    }))
  }

  getUsages(): Observable<EntitiesUsage>
  {
    return this.http.get<EntitiesUsage>('/api/entities/usage').pipe(map(results => {
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


}
