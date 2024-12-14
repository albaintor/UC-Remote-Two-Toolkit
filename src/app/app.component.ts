import {Component, OnInit} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {ServerService} from "./server.service";
import {Helper} from "./helper";



@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'UCRTool';

  constructor(private server: ServerService) { }

  ngOnInit(): void {
    this.server.getRemoteModels().subscribe(remote => {
      Helper.iconsMap = new Map(Object.entries(remote.iconMapping));
    })
  }
}
