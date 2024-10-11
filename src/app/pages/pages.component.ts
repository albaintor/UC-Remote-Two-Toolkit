import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewEncapsulation} from '@angular/core';
import {MenuItem, MessageService, PrimeTemplate} from "primeng/api";
import {Entity, Profile, ProfileGroup, Remote, RemoteData} from "../interfaces";
import {AutoCompleteModule} from "primeng/autocomplete";
import {Button} from "primeng/button";
import {DropdownModule} from "primeng/dropdown";
import {InputNumberModule} from "primeng/inputnumber";
import {MenubarModule} from "primeng/menubar";
import {NgForOf, NgIf} from "@angular/common";
import {ToastModule} from "primeng/toast";
import {TooltipModule} from "primeng/tooltip";
import {FormsModule} from "@angular/forms";
import {Helper} from "../helper";
import {ServerService} from "../server.service";
import {RemoteDataLoaderComponent} from "../remote-data-loader/remote-data-loader.component";

@Component({
  selector: 'app-pages',
  standalone: true,
  imports: [
    AutoCompleteModule,
    Button,
    DropdownModule,
    InputNumberModule,
    MenubarModule,
    NgForOf,
    NgIf,
    PrimeTemplate,
    ToastModule,
    TooltipModule,
    FormsModule,
    RemoteDataLoaderComponent
  ],
  templateUrl: './pages.component.html',
  styleUrl: './pages.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PagesComponent implements OnInit {
  menuItems: MenuItem[] = [
    {label: 'Home', routerLink: '/home', icon: 'pi pi-home'},
  ]
  selectedRemote: Remote | undefined;
  remotes: Remote[] | undefined;
  entities: Entity[] = [];
  profiles: Profile[] = [];
  protected readonly Helper = Helper;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {}

  ngOnInit()
  {
    const data = localStorage.getItem("remoteData");
    if (data) {
      const remoteData: RemoteData = JSON.parse(data);
      this.entities = remoteData.entities;
      this.profiles = remoteData.profiles;
      console.log("Profiles", this.profiles);
      this.server.setEntities(remoteData.entities);
    }
    this.server.entities$.subscribe(entities => {
      this.entities = entities
        .sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.cdr.detectChanges();
    });
    this.server.remote$.subscribe(remote => {
      this.selectedRemote = remote;
      // this.loadActivities();
      this.cdr.detectChanges();
    })
  }

  setRemote(remote: Remote): void
  {
    Helper.setRemote(remote);
    this.server.remote$.next(remote);
  }

  remoteLoaded($event: RemoteData | undefined) {
    if ($event)
    {
      this.entities = $event.entities;
      this.profiles = $event.profiles;
      console.log("Profiles", this.profiles);
      this.entities.sort((a, b) => Helper.getEntityName(a).localeCompare(Helper.getEntityName(b)));
      this.cdr.detectChanges();
    }
  }

  getGroup(group_id: string, profile: Profile): ProfileGroup {
    const group = profile.groups?.find(group => group.group_id === group_id);
    if (group)
    {
      return group;
    }
    return {group_id, name: "", entities: [], profile_id: profile.profile_id};
  }
}
