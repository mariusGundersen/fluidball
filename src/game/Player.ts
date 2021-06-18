import { HostConnection } from "../types";
import { HSVtoRGB } from "./utils";


export default class Player {
  color: { r: number; g: number; b: number; };
  dy = 0;
  dx = 0;
  aimx = 0;
  aimy = 0;
  active = false;
  charge = 0;
  x: number
  y: number
  constructor(x: number, y: number, hue: number, peer: HostConnection) {
    this.color = HSVtoRGB(hue, 0.9, 0.9)
    this.x = x;
    this.y = y;

    peer.on('move', ({ x, y }) => {
      this.dx = x * 2;
      this.dy = y * 2;
    });

    peer.on('aim', ({ x, y }) => {
      this.aimx = x;
      this.aimy = y;
      this.active = true;
    });

    peer.on('kick', () => {
      this.active = false;
    });
  }
}
