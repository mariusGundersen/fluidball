import { HostConnection } from "../types";
import { HSVtoRGB } from "./utils";


export default class Player {
  readonly color: { r: number; g: number; b: number; };
  readonly team: number;
  dy = 0;
  dx = 0;
  aimx = 0;
  aimy = 0;
  active = false;
  charge = 0;
  x: number
  y: number
  readonly destroy: () => void;
  constructor(team: number, peer: HostConnection) {
    this.team = team;
    this.x = team * 0.6 + 0.2;
    this.y = 0.5

    this.color = HSVtoRGB(team === 0 ? 0 : 2 / 3, 0.9, 0.9);

    this.destroy = peer.on('move', ({ x, y }, aim) => {
      this.dx = x * 2;
      this.dy = y * 2;
      this.active = !!aim;
      if (aim) {
        this.aimx = aim.x;
        this.aimy = aim.y;
      }
      peer.send('move_ack');
    });
  }

  distanceTo({ x, y }: { x: number, y: number }) {
    const dx = this.x - x;
    const dy = this.y - y;

    return Math.sqrt(dx * dx + dy * dy)
  }
  reset() {
    this.x = this.team * 0.6 + 0.2;
    this.y = 0.5
  }
}
