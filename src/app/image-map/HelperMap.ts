
export class HelperMap {
  hdc: any;


  myInit()
  {
    // get the target image
    let img = this.byId('img-imgmap201293016112');

    let x,y, w,h;

    // get it's position and width+height
    x = img.offsetLeft;
    y = img.offsetTop;
    w = img.clientWidth;
    h = img.clientHeight;

    // move the canvas, so it's contained by the same parent as the image
    var imgParent = img.parentNode as HTMLElement;
    var can: HTMLCanvasElement = this.byId('remote-canvas') as HTMLCanvasElement;
    imgParent.appendChild(can);

    // place the canvas in front of the image
    can.style.zIndex = "1";

    // position it over the image
    can.style.left = x+'px';
    can.style.top = y+'px';

    // make same size as the image
    can.setAttribute('width', w+'px');
    can.setAttribute('height', h+'px');

    // get it's context
    this.hdc = can.getContext('2d');

    // set the 'default' values for the colour/width of fill/stroke operations
    this.hdc.fillStyle = 'red';
    this.hdc.strokeStyle = 'red';
    this.hdc.lineWidth = 2;
  }

  byId(e: string): HTMLCanvasElement | HTMLImageElement {
    return document.getElementById(e) as HTMLCanvasElement  | HTMLImageElement;
  }

  drawPoly(coOrdStr: string)
  {
    let mCoords = coOrdStr.split(',');
    let i: number, n = mCoords.length;
    this.hdc.beginPath();
    this.hdc.moveTo(mCoords[0], mCoords[1]);
    for (i=2; i<n; i+=2)
    {
      this.hdc.lineTo(mCoords[i], mCoords[i+1]);
    }
    this.hdc.lineTo(mCoords[0], mCoords[1]);
    this.hdc.stroke();
  }

  drawRect(coOrdStr: string)
  {
    let mCoords = coOrdStr.split(',');
    let top: number, left: number, bot: number, right: number;
    left = parseInt(mCoords[0]);
    top = parseInt(mCoords[1]);
    right = parseInt(mCoords[2]);
    bot = parseInt(mCoords[3]);
    this.hdc.strokeRect(left,top,right-left,bot-top);
  }

  myHover(element: HTMLElement)
  {
    let hoveredElement = element;
    let coordStr = element.getAttribute('coords')!;
    let areaType = element.getAttribute('shape');

    switch (areaType)
    {
      case 'polygon':
      case 'poly':
        this.drawPoly(coordStr);
        break;

      case 'rect':
        this.drawRect(coordStr);
    }
  }

  myLeave()
  {
    let canvas = this.byId('remote-canvas')!;
    this.hdc.clearRect(0, 0, canvas.width, canvas.height);
  }



}
