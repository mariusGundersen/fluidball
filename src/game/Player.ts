import { HostConnection } from "../types";
import { HSVtoRGB } from "./utils";


export const MAX_CHARGE = 16 * 5;

export default class Player {
  readonly color: { r: number; g: number; b: number; };
  readonly team: number;
  dy = 0;
  dx = 0;
  aimx = 0;
  aimy = 0;
  aiming = false;
  charge = 0;
  x: number;
  y: number;
  readonly destroy: () => void;
  constructor(team: number, peer: HostConnection) {
    this.team = team;
    this.x = team * 0.6 + 0.2;
    this.y = 0.5

    this.color = team === 0 ? HSVtoRGB(300, 0.9, 0.9) : HSVtoRGB(240 / 360, 0.9, 0.9);

    this.destroy = peer.on('move', ({ x, y }, aim) => {
      this.dx = x * 2;
      this.dy = y * 2;
      this.aiming = false;
      if (aim) {
        const d = Math.sqrt(aim.x * aim.x + aim.y * aim.y);
        if (d > 0) {
          this.aimx = aim.x / d;
          this.aimy = aim.y / d;
          this.aiming = true;
        }
      }
      peer.send('move_ack');
    });
  }

  get radius() {
    return 0.015 - 0.005 * this.charge / MAX_CHARGE;
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
