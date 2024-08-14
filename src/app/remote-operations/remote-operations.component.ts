import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, EventEmitter,
  Input, Output,
  ViewEncapsulation
} from '@angular/core';
import {DialogModule} from "primeng/dialog";
import {ToastModule} from "primeng/toast";
import {MessageService} from "primeng/api";
import {ServerService} from "../server.service";
import {ButtonModule} from "primeng/button";
import {NgIf} from "@angular/common";
import {TableModule} from "primeng/table";
import {TooltipModule} from "primeng/tooltip";
import {OperationStatus, Remote, RemoteOperation} from "../interfaces";
import {NgxJsonViewerModule} from "ngx-json-viewer";
import {catchError, forkJoin, from, map, mergeMap, of} from "rxjs";
import {ChipModule} from "primeng/chip";

@Component({
  selector: 'app-remote-operations',
  standalone: true,
  imports: [
    DialogModule,
    ToastModule,
    ButtonModule,
    NgIf,
    TableModule,
    TooltipModule,
    NgxJsonViewerModule,
    ChipModule
  ],
  templateUrl: './remote-operations.component.html',
  styleUrl: './remote-operations.component.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class RemoteOperationsComponent {
  _visible = false;
  @Input() get visible(): boolean {
    return this._visible;
  }
  set visible(value: boolean) {
    this._visible = value;
    this.visibleChange.emit(this._visible);
  }
  @Input()
  get operations(): RemoteOperation[] {
    return this._operations;
  }
  set operations(value: RemoteOperation[])
  {
    this._operations = value;
    this.selectedOperations = [...this.operations];
  }
  _operations: RemoteOperation[] = [];
  @Input({required: true}) remote: Remote | undefined;
  selectedOperations: RemoteOperation[] = [];
  @Output() visibleChange: EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor(private server:ServerService, private cdr:ChangeDetectorRef, private messageService: MessageService)
  {

  }

  getStatusLabel(status: OperationStatus): string
  {
    if (status === OperationStatus.Todo) return "To do";
    if (status === OperationStatus.Done) return "Done";
    if (status === OperationStatus.Error) return "Error";
    if (status === OperationStatus.Cancelled) return "Cancelled";
    return "Unknown";
  }

  getStatusLabelStyle(status: OperationStatus) {
    let color = 'gray';
    if (status === OperationStatus.Todo) color = 'blue';
    if (status === OperationStatus.Done) color = 'green';
    if (status === OperationStatus.Error) color = 'red';
    if (status === OperationStatus.Cancelled) color = 'black';
    return {"background-color" : color};
  }

  getErrorMessage(error: any): string
  {
    if (error.error?.body)
    {
      try {
        const body = JSON.parse(error.error?.body);
        if (body.message) return body.message;
        return JSON.stringify(body);
      } catch(err) {
      }
    }
    try {
      return JSON.stringify(error.error);
    } catch (e) {}
    return error.toString();
  }

  updateRemote() {
    if (!this.remote) return;
    const operations = from(this.selectedOperations
      .filter(operation => operation.status == OperationStatus.Todo)).pipe(
      mergeMap(operation => {
        if (operation.method === "POST")
          return this.server.remotePost(this.remote!, operation.api, operation.body).pipe(
            map(results => {
              console.log("Results from remote for operation", operation, results);
              operation.status = OperationStatus.Done;
              this.cdr.detectChanges();
              return of(operation);
          }),
            catchError(error => {
              operation.status = OperationStatus.Error;
              operation.message = this.getErrorMessage(error);
              this.cdr.detectChanges();
              console.error("Error during update", operation, error);
              return of(operation);
          }));
        if (operation.method === "PATCH")
          return this.server.remotePatch(this.remote!, operation.api, operation.body).pipe(
            map(results => {
              console.log("Results from remote for operation", operation, results);
              operation.status = OperationStatus.Done;
              this.cdr.detectChanges();
              return of(operation);
            }),
            catchError(error => {
              operation.status = OperationStatus.Error;
              operation.message = this.getErrorMessage(error);
              this.cdr.detectChanges();
              console.error("Error during update", operation, error);
              return of(operation);
            }));
        if (operation.method === "DELETE")
          return this.server.remoteDelete(this.remote!, operation.api).pipe(
            map(results => {
              console.log("Results from remote for operation", operation, results);
              operation.status = OperationStatus.Done;
              this.cdr.detectChanges();
              return of(operation);
            }),
            catchError(error => {
              operation.status = OperationStatus.Error;
              operation.message = this.getErrorMessage(error);
              this.cdr.detectChanges();
              console.error("Error during update", operation, error);
              return of(operation);
            }));
        if (operation.method === "PUT")
          return this.server.remotePut(this.remote!, operation.api, operation.body).pipe(
            map(results => {
              console.log("Results from remote for operation", operation, results);
              operation.status = OperationStatus.Done;
              this.cdr.detectChanges();
              return of(operation);
            }),
            catchError(error => {
              operation.status = OperationStatus.Error;
              operation.message = this.getErrorMessage(error);
              this.cdr.detectChanges();
              console.error("Error during update", operation, error);
              return of(operation);
            }));
        // Should not happen
        return of(of(operation));
    }, 1));

    forkJoin([operations]).subscribe(
      {
        next: results => {
          const success = this.operations.filter(operation => operation.status === OperationStatus.Done).length;
          const errors = this.operations.filter(operation => operation.status === OperationStatus.Error).length;
          const severity = errors > 0 ? "info": "success";
          this.messageService.add({severity, summary: "Selected operations executed to remote",
            detail: `${success} success, ${errors} errors`,
            key: "operation"});
          this.cdr.detectChanges();
        },
        error: err => {
          console.log("Error during the execution of the operations", err);
          this.messageService.add({severity: "error", summary: "Error during the execution of the selected operations",
            key: "operation"});
          this.cdr.detectChanges();
        }
      }
    )
  }

  protected readonly OperationStatus = OperationStatus;

  setStatus(operation: RemoteOperation, status: OperationStatus) {
    operation.status = status;
    this.cdr.detectChanges();
  }

  resetAll() {
    this.operations.forEach(operation => operation.status = OperationStatus.Todo);
    this.cdr.detectChanges();
  }

  resetErrors() {
    this.operations.forEach(operation => {
      if (operation.status === OperationStatus.Error) {
        operation.status = OperationStatus.Todo;
      }
    });
    this.cdr.detectChanges();
  }

  hasErrors() {
    return this.operations.find(operation => operation.status == OperationStatus.Error);
  }

  hasDone() {
    return this.operations.find(operation => operation.status !== OperationStatus.Todo);
  }
}
