import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Pipe, PipeTransform} from '@angular/core';
import {MessageService} from "primeng/api";
import {ServerService} from "../server.service";
import {Activity, ActivityPage, ActivityPageCommand, Command} from "../interfaces";
import {DialogModule} from "primeng/dialog";
import {ToastModule} from "primeng/toast";
import {NgForOf, NgIf} from "@angular/common";
import {PaginatorModule, PaginatorState} from "primeng/paginator";
import {ChipModule} from "primeng/chip";

@Pipe({name: 'as', standalone: true, pure: true})
export class AsPipe implements PipeTransform {
  transform<T>(input: unknown, baseItem: T | undefined): T {
    return (input as unknown) as T;
  }
}
@Component({
  selector: 'app-activity-editor',
  standalone: true,
  imports: [
    DialogModule,
    ToastModule,
    NgIf,
    PaginatorModule,
    NgForOf,
    AsPipe,
    ChipModule
  ],
  templateUrl: './activity-editor.component.html',
  styleUrl: './activity-editor.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityEditorComponent {
  visible = false;
  currentPage: ActivityPage | undefined;
  activity: Activity | undefined;
  public Command!: Command;

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService) {
  }

  getGridItems(): (ActivityPageCommand | null)[]
  {
    const list: (ActivityPageCommand | null)[] = [];
    for (let y=0; y<this.currentPage?.grid.height!; y++)
    {
      for (let x=0; x<this.currentPage?.grid.width!; x++)
      {
        const item = this.currentPage?.items.find(item => item.location.x == x && item.location.y == y);
        if (item == null) list.push(null);
        else
          list.push(item);
      }
    }
    console.log("Grid for activity", list);
    return list;
  }

  loadActivity(activity: Activity)
  {
    this.activity = activity;
    this.currentPage = activity.options?.user_interface?.pages?.[0];
    this.visible = true;
    this.cdr.detectChanges();
  }

  onPageChange($event: PaginatorState) {
    this.currentPage = this.activity?.options?.user_interface?.pages?.[$event.page!];
    this.cdr.detectChanges();
  }

  getEntityName(entityId: string): string
  {
    const entity = this.server.entities.find(entity => entity.entity_id === entityId);
    if (entity?.name)
      return entity.name;
    return `Unknown ${entityId}`;
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
}
