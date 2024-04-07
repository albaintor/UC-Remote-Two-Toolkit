import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {map, Observable} from "rxjs";
import {Activities, Context, Entities, EntitiesUsage, Entity, EntityUsage, Profiles} from "./interfaces";

@Injectable({
  providedIn: 'root'
})
export class ServerService {

  constructor(private http: HttpClient) { }

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
