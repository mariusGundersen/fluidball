import { canvas } from './index';
import { correctDeltaX, correctDeltaY, generateColor } from "./utils";

export class Pointer {
  texcoordX: number;
  texcoordY: number;
  prevTexcoordX: number;
  prevTexcoordY: number;
  deltaX = 0;
  deltaY = 0;
  moved = false;
  color = generateColor();
  constructor(posX: number, posY: number) {
    this.texcoordX = posX / canvas.width;
    this.texcoordY = 1.0 - posY / canvas.height;
    this.prevTexcoordX = this.texcoordX;
    this.prevTexcoordY = this.texcoordY;
  }

  updatePos(posX: number, posY: number) {
    this.prevTexcoordX = this.texcoordX;
    this.prevTexcoordY = this.texcoordY;
    this.texcoordX = posX / canvas.width;
    this.texcoordY = 1.0 - posY / canvas.height;
    this.deltaX = correctDeltaX(canvas, this.texcoordX - this.prevTexcoordX);
    this.deltaY = correctDeltaY(canvas, this.texcoordY - this.prevTexcoordY);
    this.moved = Math.abs(this.deltaX) > 0 || Math.abs(this.deltaY) > 0;
  }
}
