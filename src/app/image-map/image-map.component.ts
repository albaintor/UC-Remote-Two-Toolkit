import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-image-map',
  standalone: true,
  imports: [],
  templateUrl: './image-map.component.html',
  styleUrl: './image-map.component.css'
})
export class ImageMapComponent {
  @Input() image: string | undefined;

}
