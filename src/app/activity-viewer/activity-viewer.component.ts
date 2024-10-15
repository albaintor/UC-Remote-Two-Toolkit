import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef, EventEmitter, Input, Output,
  Pipe,
  PipeTransform, QueryList,
  ViewChild, ViewChildren, ViewEncapsulation
} from '@angular/core';
import {ConfirmationService, MessageService} from "primeng/api";
import {ServerService} from "../server.service";
import {
  Activity,
  UIPage,
  ActivityPageCommand,
  Command,
  Remote,
  Entity,
  EntityCommand, RemoteData, ScreenLayout
} from "../interfaces";
import {DialogModule} from "primeng/dialog";
import {ToastModule} from "primeng/toast";
import {NgForOf, NgIf} from "@angular/common";
import {PaginatorModule, PaginatorState} from "primeng/paginator";
import {ChipModule} from "primeng/chip";
import {OverlayPanelModule} from "primeng/overlaypanel";
import {RouterLink} from "@angular/router";
import {ActivityGridItemComponent} from "./activity-grid-item/activity-grid-item.component";
import {ButtonModule} from "primeng/button";
import {NgxJsonViewerModule} from "ngx-json-viewer";
import {Helper} from "../helper";
import {UiCommandEditorComponent} from "../activity-editor/ui-command-editor/ui-command-editor.component";
import { saveAs } from 'file-saver-es';
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {ButtonEditorComponent} from "../activity-editor/button-editor/button-editor.component";
import {from, map, Observable} from "rxjs";
import {ActivitySequenceComponent} from "../activity-editor/activity-sequence/activity-sequence.component";
import {ImageMapComponent} from "../controls/image-map/image-map.component";
import {DividerModule} from "primeng/divider";
import {ToolbarModule} from "primeng/toolbar";
import {DockModule} from "primeng/dock";
import {ActivityPageListComponent, Operation} from "./activity-page-list/activity-page-list.component";
import {TagModule} from "primeng/tag";
import {InputTextModule} from "primeng/inputtext";
import {ActivityButtonsComponent} from "./activity-buttons/activity-buttons.component";
import {ActivityGridComponent} from "./activity-grid/activity-grid.component";

enum DataFormat {
  None,
  Page,
  UICommands,
  Activity
}

@Pipe({name: 'as', standalone: true, pure: true})
export class AsPipe implements PipeTransform {
  transform<T>(input: unknown, baseItem: T | undefined): T {
    return (input as unknown) as T;
  }
}
@Component({
  selector: 'app-activity-viewer',
  standalone: true,
  imports: [
    DialogModule,
    ToastModule,
    NgIf,
    PaginatorModule,
    NgForOf,
    AsPipe,
    ChipModule,
    OverlayPanelModule,
    RouterLink,
    ActivityGridItemComponent,
    ButtonModule,
    NgxJsonViewerModule,
    UiCommandEditorComponent,
    ConfirmDialogModule,
    ButtonEditorComponent,
    ActivitySequenceComponent,
    ImageMapComponent,
    DividerModule,
    ToolbarModule,
    DockModule,
    ActivityPageListComponent,
    TagModule,
    InputTextModule,
    ActivityButtonsComponent,
    ActivityGridComponent
  ],
  templateUrl: './activity-viewer.component.html',
  styleUrl: './activity-viewer.component.css',
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ActivityViewerComponent implements AfterViewInit {
  currentPage: UIPage | undefined;
  configEntityCommands: EntityCommand[] | undefined;
  gridSizeMin: { width: number; height: number } = {width: 1, height: 1};
  screenLayout: ScreenLayout | undefined;
  @Input('activity') set _activity(value: Activity | undefined) {
    this.activity = value;
    if (value) {
      this.initView();
      this.updateButtonsGrid();
    }
  }
  activity: Activity | undefined;
  entities: Entity[] = [];
  remote: Remote | undefined;
  @Input("remote") set _remote(value: Remote | undefined) {
    this.remote = value;
    if (value) {
      this.server.getConfigScreenLayout(value).subscribe(screenLayout => {
        this.screenLayout = screenLayout;
        this.cdr.detectChanges();
      })
    }
  }
  @Input() editMode = true;
  @Output() onChange: EventEmitter<void> = new EventEmitter();
  @Output() reload = new EventEmitter<void>();
  public Command!: Command;
  @ViewChild("commandeditor", {static: false}) commandeditor: UiCommandEditorComponent | undefined;
  @ViewChild("input_file_page", {static: false}) input_file_page: ElementRef | undefined;
  @ViewChildren(ActivityGridItemComponent) gridButtons:QueryList<ActivityGridItemComponent> | undefined;
  @ViewChild(ActivityButtonsComponent) buttons:ActivityButtonsComponent | undefined;
  @ViewChild(ActivityGridComponent) activityGrid:ActivityGridComponent | undefined;

  protected readonly JSON = JSON;
  showDump: boolean = false;
  firstPage = 0;
  gridPixelWidth = 4*185;
  gridPixelHeight = 6*185;
  protected readonly Helper = Helper;
  selectionMode = false;
  selection: ActivityGridItemComponent[] = [];
  includedEntity: Entity | undefined;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService,
              private confirmationService: ConfirmationService) {
  }

  ngAfterViewInit(): void {
    const data = localStorage.getItem("remoteData");
    if (data) {
      const remoteData: RemoteData = JSON.parse(data);
      if (remoteData.configCommands)
        this.configEntityCommands = remoteData.configCommands;
    }
    this.server.configCommands$.subscribe(entityCommands => {
      this.configEntityCommands = entityCommands;
    })
    if (this.remote && (!this.configEntityCommands || this.configEntityCommands.length == 0))
    {
      this.server.getConfigEntityCommands(this.remote).subscribe(entityCommands => {
        this.configEntityCommands = entityCommands;
        this.cdr.detectChanges();
      });
      this.server.getConfigScreenLayout(this.remote).subscribe(screenLayout => {
        this.screenLayout = screenLayout;
        console.debug("Screen layout", this.screenLayout);
        this.cdr.detectChanges();
      });
    }
    this.server.entities$.subscribe(entities => {
      this.entities = entities;
      this.cdr.detectChanges();
    });
  }

  view(activity: Activity, editable: boolean): void {
    if (activity)
      this.activity = activity;
    this.editMode = editable;
    this.initView();
  }

  initView()
  {
    this.showDump = false;
    this.currentPage = this.activity?.options?.user_interface?.pages?.[0];
    this.firstPage = 0;
    console.log("View activity", this.activity);
    this.updateButtonsGrid();
    this.updateCurrentPage();
  }

  updateButtonsGrid()
  {
    this.activityGrid?.updateCurrentPage();
    this.updateButtons();
    this.updateCurrentPage();
    this.cdr.detectChanges();
  }

  updateButtons()
  {
    this.buttons?.updateButtons();
  }

  updateCurrentPage()
  {
    if (this.activityGrid?.currentPage)
      this.gridSizeMin = Helper.getGridMinSize(this.activityGrid!.getGridPageItems(this.activityGrid?.currentPage));
  }

  onPageChange($event: PaginatorState) {
    this.firstPage = $event.page as number;
    this.currentPage = this.activity?.options?.user_interface?.pages?.[$event.page!];
    this.updateButtonsGrid();
    this.updateCurrentPage();
    this.cdr.detectChanges();
  }

  onReorderPages($event:  {activity: Activity, page: UIPage, operation: Operation})
  {
    this.currentPage = this.activity?.options?.user_interface?.pages?.[0];
    this.firstPage = 0;
    if ($event.operation == Operation.AddPage)
    {
      this.currentPage = this.activity?.options?.user_interface?.pages?.[this.activity?.options?.user_interface?.pages?.length-1];
      if (this.activity?.options?.user_interface?.pages?.length)
        this.firstPage = this.activity.options.user_interface.pages.length-1;
    }
    this.updateButtonsGrid();
    this.updateCurrentPage();
    this.onChange.emit();

    this.cdr.detectChanges();
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

  toggleSelectionMode()
  {
    this.selectionMode = !this.selectionMode;
    this.selection = [];
    this.cdr.detectChanges();
  }

  copySelectionToClipboard() {
    this.copyToClipboard(this.selection.map(item => item.item), "Selected commands copied to clipboard");
  }

  pasteSelectionFomClipboard()
  {
    this.getClipboardFormat().subscribe(data => {
      if (data.format != DataFormat.UICommands) {
        this.messageService.add({severity:'error', summary: "Clipboard format is not a selection of commands", key: 'activity'});
        this.cdr.detectChanges();
        return;
      }
      if (!this.activity || !this.currentPage) return;
      const commands: ActivityPageCommand[] = data.object;
      for (let command of commands)
      {
        if (!Helper.checkItem(command, this.currentPage.items, command.location.x, command.location.y, command.size.width, command.size.height))
        {
          this.messageService.add({severity:'error', summary: "Cannot paste commands in this page, there is some overlap", key: 'activity'});
          this.cdr.detectChanges();
          return;
        }
      }
      for (let command of commands)
      {
        this.currentPage.items.push(command);
      }
      this.updateButtonsGrid();
      this.messageService.add({severity:'success', summary: `Pasted ${commands.length} commands into current page`, key: 'activity'});
      this.cdr.detectChanges();
    })
  }

  copyToClipboard(data: any, title: string | undefined = undefined) {
    navigator.clipboard.writeText(JSON.stringify(data)).then(r => {
      if (title)
        this.messageService.add({severity:'success', summary: title, key: 'activity'});
      else
        this.messageService.add({severity:'success', summary: "Activity data copied to clipboard", key: 'activity'});
      this.cdr.detectChanges();
    });
  }

  deletePage($event: any)
  {
    if (!this.currentPage || !this.activity?.entity_id) return;
    this.confirmationService.confirm({
      target: $event.target as EventTarget,
      key: "activityViewerDialog",
      message: `Are you sure that you want to delete this page "${this.currentPage.name}" ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptIcon:"none",
      rejectIcon:"none",
      rejectButtonStyleClass:"p-button-text",
      accept: () => {
        if (!this.activity?.entity_id || !this.remote) return;
        this.server.deleteRemoteActivityPage(this.remote, this.activity.entity_id, this.currentPage!.page_id!)
          .subscribe({next: results =>
          {
            this.messageService.add({
              severity: 'success',
              summary: `Page "${this.currentPage?.name}" successfully deleted`
            });
            this.reload.emit();
            this.cdr.detectChanges();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: `Error while deleting page "${this.currentPage?.name}"`
            });
            this.cdr.detectChanges();
          }
        });

      },
      reject: () => {
      }
    });
  }

  getClipboardFormat(): Observable<{format: DataFormat, object:any | undefined}>
  {
    return from(navigator.clipboard.readText()).pipe(map(text => {
      if (!text || text == "") return {format: DataFormat.None, object: undefined};
      const data: any = JSON.parse(text);
      if (Array.isArray(data) && data.length > 0)
      {
        const item = data[0];
        if (item.hasOwnProperty("size") || item.hasOwnProperty("location"))
          return {format: DataFormat.UICommands, object: data};
      }
      else if (data.hasOwnProperty("entity_type") && data.entity_type == 'activity')
        return {format: DataFormat.Activity, object: data};
      return {format: DataFormat.None, object: undefined};
    }))
  }

  pastePage() {
    navigator.clipboard.readText().then(data => {
      const page:UIPage = JSON.parse(data);
      if (!this.activity) return;
      if (!page || !page.grid || !page.items || !page.name)
      {
        this.messageService.add({severity:'error', summary: "Invalid data from clipboard, not an UI page", key: 'activity'});
        this.cdr.detectChanges();
        return;
      }
      if (!this.activity.options) this.activity.options = { user_interface: {} };
      if (!this.activity.options.user_interface!.pages) this.activity.options.user_interface!.pages = [];
      delete page.page_id;
      this.activity.options.user_interface!.pages.push(page);
      this.messageService.add({severity:'success', summary: `Page ${page.name} with ${page.items.length} items added successfully`, key: 'activity'});
      this.updateButtonsGrid();
      this.onChange.emit();
      this.cdr.detectChanges();
    })
  }

  saveActivity()
  {
    if (!this.activity) return;
    saveAs(new Blob([JSON.stringify(this.activity)], {type: "text/plain;charset=utf-8"}),
      `${Helper.getEntityName(this.activity)}.json`);
  }

  savePage()
  {
    if (!this.currentPage ||!this.activity) return;
    const fileName = this.currentPage?.name ? this.currentPage.name : "Page";
    saveAs(new Blob([JSON.stringify(this.currentPage)], {type: "text/plain;charset=utf-8"}),
      `${Helper.getEntityName(this.activity)}_${fileName}.json`);
  }

  importPage() {
    this.input_file_page?.nativeElement.click();
  }

  loadInputFilePage($event: Event) {
    const file = ($event.target as any)?.files?.[0];
    let fileReader = new FileReader();
    fileReader.onload = (e) => {
      if (fileReader.result){
        const page:UIPage = JSON.parse(fileReader.result.toString());
        if (!this.activity) return;
        if (!page || !page.grid || !page.items || !page.name)
        {
          this.messageService.add({severity:'error', summary: "Invalid data from file, not an UI page", key: 'activity'});
          this.cdr.detectChanges();
          return;
        }
        if (!this.activity.options) this.activity.options = { user_interface: {} };
        if (!this.activity.options.user_interface!.pages) this.activity.options.user_interface!.pages = [];
        delete page.page_id;
        this.activity.options.user_interface!.pages.push(page);
        this.messageService.add({severity:'success', summary: `Page ${page.name} with ${page.items.length} items added successfully`, key: 'activity'});
        this.updateButtonsGrid();
        this.onChange.emit();
        this.cdr.detectChanges();
      }
    }
    fileReader.readAsText(file);
  }

  deleteActivity($event: any) {
    this.confirmationService.confirm({
      target: $event.target as EventTarget,
      key: "activityViewerDialog",
      message: `Are you sure that you want to delete the activity "${Helper.getEntityName(this.activity)}" ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptIcon:"none",
      rejectIcon:"none",
      rejectButtonStyleClass:"p-button-text",
      accept: () => {
        if (!this.activity?.entity_id || !this.remote) return;
        this.server.deleteRemoteActivity(this.remote, this.activity.entity_id).subscribe({next: results =>
          {
            this.messageService.add({
              severity: 'success',
              summary: `Activity "${Helper.getEntityName(this.activity)}" successfully deleted`
            });
            this.onChange.emit();
            this.cdr.detectChanges();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: `Error while deleting activity "${Helper.getEntityName(this.activity)}"`
            });
            this.cdr.detectChanges();
          }
      });

      },
      reject: () => {
      }
    });
  }

  selectPage($event: { activity: Activity; page: UIPage }) {
    this.onPageChange({page: this.activity?.options?.user_interface?.pages?.indexOf($event.page)})
  }

  pageChanged($event: number)
  {
    this.firstPage = $event;
    this.currentPage = this.activity?.options?.user_interface?.pages?.[$event];
    this.updateButtonsGrid();
    this.updateCurrentPage();
    this.cdr.detectChanges();
  }

  deleteIncludedEntity(entity: Entity, $event: MouseEvent) {
    this.confirmationService.confirm({
      target: $event.target as EventTarget,
      key: "activityViewerDialog",
      header: `Are you sure that you want to remove this included entity "${Helper.getEntityName(entity)}" from the activity ?`,
      message: "This entity should also be removed from UI and buttons mapping",
      icon: 'pi pi-exclamation-triangle',
      acceptIcon:"none",
      rejectIcon:"none",
      rejectButtonStyleClass:"p-button-text",
      accept: () => {
        if (!this.activity?.entity_id || !this.remote) return;
        const index = this.activity?.options?.included_entities?.indexOf(entity);
        if (index && index >= 0)
            this.activity!.options!.included_entities!.splice(index, 1);
        this.activity!.options?.user_interface?.pages?.forEach(page => {
          const items = page.items.filter(item =>
            (item.command && (item.command as any)?.entity_id === entity.entity_id
              || item.media_player_id && item.media_player_id === entity.entity_id));
          items.forEach(item => {
            page.items.splice(page.items.indexOf(item), 1);
          })
        });
        this.activity.options?.button_mapping?.forEach(button => {
          if (button?.short_press?.entity_id === entity.entity_id) delete button.short_press;
          if (button?.long_press?.entity_id === entity.entity_id) delete button.long_press;
          if (button?.double_press?.entity_id === entity.entity_id) delete button.double_press;
        });
        ['on', 'off'].forEach(type => {
          const items = this.activity?.options?.sequences?.[type]?.filter(item => item.command && item.command.entity_id === entity.entity_id);
          items?.forEach(item => {
            this.activity?.options?.sequences?.[type]?.splice(this.activity?.options?.sequences?.[type].indexOf(item), 1);
          })
        })
        this.cdr.detectChanges();
      },
      reject: () => {
        if (!this.activity?.options?.included_entities?.find(item => item.entity_id === entity.entity_id))
          this.activity!.options!.included_entities!.push(entity);
          this.cdr.detectChanges();
      }
    });
  }

  addIncludedEntity(entity: Entity | undefined) {
    if (entity) {
      if (!this.activity?.options?.included_entities?.find(item => item.entity_id === entity.entity_id)) {
        this.activity?.options?.included_entities?.push(entity);
        this.cdr.detectChanges();
      }
    }
    this.includedEntity = undefined;
  }
}
