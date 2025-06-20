import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output} from '@angular/core';
import {ServerService} from "../server.service";
import {MessageService} from "primeng/api";
import {DialogModule} from "primeng/dialog";
import {ChipModule} from "primeng/chip";
import {CommonModule} from "@angular/common";
import {TableModule} from "primeng/table";
import {ButtonModule} from "primeng/button";
import {TooltipModule} from "primeng/tooltip";
import {ToastModule} from "primeng/toast";
import { HttpErrorResponse } from "@angular/common/http";

@Component({
    selector: 'app-uploaded-files',
    imports: [
        CommonModule,
        DialogModule,
        ChipModule,
        TableModule,
        ButtonModule,
        TooltipModule,
        ToastModule
    ],
    templateUrl: './uploaded-files.component.html',
    styleUrl: './uploaded-files.component.css',
    providers: [MessageService],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UploadedFilesComponent {

  uploadedFiles: string[] = [];
  visible = false;
  @Input() currentSource: string | undefined = undefined;
  @Output() configurationUpdated = new EventEmitter<string>();

  constructor(private server: ServerService, private cdr: ChangeDetectorRef, private messageService: MessageService) {
  }

  loadFiles() {
    this.server.getUploadedFiles().subscribe(results => {
      this.uploadedFiles = results;
      this.cdr.detectChanges();
    })
  }

  deleteFile(filename: string) {
    this.server.deleteUploadedFile(filename).subscribe({
      next: results => {
        this.messageService.add({severity: "success", summary: `Filename ${filename} deleted successfully`});
        this.cdr.detectChanges();
      }, error: error => {
        const message = this.parseError(error);
        this.messageService.add({
          severity: "error",
          summary: `Error while deleting ${filename}`,
          detail: message.toString()
        })

        this.cdr.detectChanges();
      }
    })
  }

  parseError(error: HttpErrorResponse | any): string {
    if (error instanceof HttpErrorResponse) {
      return error.message;
    }
    return JSON.parse(error).toString();
  }

  downloadFileResponse(response: Response, filename: string) {
    let dataType = response.type;
    let binaryData = [];
    binaryData.push(response);
    let downloadLink = document.createElement('a');
    downloadLink.href = window.URL.createObjectURL(new Blob(binaryData as any, {type: dataType}));
    if (filename)
      downloadLink.setAttribute('download', filename);
    document.body.appendChild(downloadLink);
    downloadLink.click();
  }

  downloadFile(url: string)
  {
    this.server.getBackup(url).subscribe(results => {
      this.downloadFileResponse(results, url);
    })
  }

  loadFile(filename: any) {
    this.server.loadFile(filename).subscribe({
      next: results => {
        this.messageService.add({severity: "success", summary: `Filename ${filename} loaded successfully`});
        this.configurationUpdated.emit(filename);
        this.cdr.detectChanges();
      }, error: error => {
        console.error("Error while loading file", error);
        const message = this.parseError(error);
        this.messageService.add({
          severity: "error",
          summary: `Error while loading ${filename}`,
          detail: message.toString()
        })
        this.cdr.detectChanges();
      }
    })
  }
}
