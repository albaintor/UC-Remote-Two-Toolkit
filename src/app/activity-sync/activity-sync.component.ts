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
import {Activity, ButtonMapping, CommandSequence, Config, Remote, RemoteData, UIPage} from "../interfaces";
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
    Button
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

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService,
              private confirmationService: ConfirmationService) {
  }

  ngOnInit(): void {
    this.server.getConfig().subscribe(config => {
      this.updateRemote(config);
      this.server.config$.subscribe(config => {
        this.updateRemote(config);
      })
    })
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

  private syncActivities() {
    if (this.selectedActivities.length == 0)
    {
      this.messageService.add({severity: "warn", summary: "No activities selected"});
      this.cdr.detectChanges();
      return;
    }
    this.messageService.add({severity: "warn", summary: "Not implemented yet"});
    this.cdr.detectChanges();
  }
}
