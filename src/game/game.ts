import { HostConnection } from "../types";
import getWebGLContext from "./getWebGLContext";
import Player from "./Player";
import Renderer from "./Renderer";
import { clamp, dim, randomSplat, resizeCanvas } from "./utils";
import WebGLScreen from "./WebGLScreen";

export default class Game {
  private readonly players: Player[] = [];
  private readonly renderer: Renderer;
  private readonly screen: WebGLScreen;
  private lastUpdateTime: number;
  private playing = true;
  private readonly ball = {
    x: 0.5,
    y: 0.5,
    inGoal: false,
  };

  constructor(canvas: HTMLCanvasElement) {
    resizeCanvas(canvas);

    const { gl, ext } = getWebGLContext(canvas);

    this.renderer = new Renderer(gl, ext);
    this.screen = new WebGLScreen(gl);

    this.lastUpdateTime = window.performance.now();

    requestAnimationFrame(now => this.update(now));

    this.multipleSplats(20);
  }

  destroy() {
    this.playing = false;
    for (const player of this.players) {
      player.destroy();
    }

  }

  removePlayerAt(index: number) {
    this.players.splice(index, 1);
  }

  addPlayer(peer: HostConnection) {
    const team = this.players.length % 2;

    this.players.push(new Player(team, peer));
  }

  reset() {
    this.renderer.reset();
    this.ball.x = 0.5;
    this.ball.y = 0.5;
    this.ball.inGoal = false;
    for (const player of this.players) {
      player.reset();
    }
  }

  multipleSplats(amount: number) {
    for (let i = 0; i < amount; i++) {
      const { x, y, dx, dy, color } = randomSplat();
      this.renderer.splat(x, y, dx, dy, color);
    }
  }

  update(now: number) {
    const dt = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    this.applyInputs(2, dt);
    if (this.players.length === 2) {
      this.updateBall(dt);
    }

    this.renderer.step(dt);
    this.renderer.render(this.screen, [this.ball.x, this.ball.y], this.players);

    if (this.playing) {
      requestAnimationFrame(now => this.update(now));
    }
  }


  applyInputs(aspectRatio: number, dt: number) {

    const delta = dt * 1_000;

    for (const player of this.players) {
      let dx = player.dx * dt;
      let dy = player.dy * dt * aspectRatio;

      dx /= 10;
      dy /= 10;

      player.x += dx;
      player.y += dy;
      player.x = clamp(player.x, player.team === 0 ? 0.05 : 0.10, player.team === 0 ? 0.90 : 0.95);
      player.y = clamp(player.y, 0.01, 0.99);

      const MAX_CHARGE = 16 * 5;

      if (player.charge >= MAX_CHARGE) {
        const distance = player.distanceTo(this.ball);
        if (distance < 0.03) {
          player.aimx = (this.ball.x - player.x) / distance;
          player.aimy = (this.ball.y - player.y) / distance;
          player.active = false;
        }
      }

      const aimx = player.aimx;
      const aimy = player.aimy * aspectRatio;

      if (player.active) {
        this.renderer.splat(player.x, player.y, 0, 0, dim(player.color, 10), 5000);
      } else if (player.charge) {
        const KICK_FORCE = 10;
        this.renderer.splat(player.x, player.y, aimx * delta * KICK_FORCE, aimy * delta * KICK_FORCE, player.color, 100);
      } else {
        this.renderer.splat(player.x, player.y, 0, 0, dim(player.color, 10), 5000);
      }

      this.renderer.sourceDrain(player.x + aimx / 100, player.y + aimy / 100, player.active ? -150 : -5, player.color);

      if (player.active) {
        player.charge = Math.min(MAX_CHARGE, player.charge + delta / 10);
      } else {
        player.charge = Math.max(0, player.charge - delta);
      }
    }
  }

  goalScored() {
    this.multipleSplats(20);
    this.ball.inGoal = true;
    setTimeout(() => this.reset(), 3000);
  }

  updateBall(dt: number) {
    const { dx, dy } = this.renderer.getVelocityAt(this.ball.x, this.ball.y, dt);

    if (!this.ball.inGoal) {
      if (this.ball.x < 0.95 && this.ball.x + dx > 0.95) {
        const y = this.ball.y + dy * (0.95 - this.ball.x) / dx;
        if (y > 0.44 && y < 0.56) {
          this.goalScored();
        }
      } else if (this.ball.x > 0.05 && this.ball.x + dx < 0.05) {
        const y = this.ball.y + dy * (0.05 - this.ball.x) / dx;
        if (y > 0.44 && y < 0.56) {
          this.goalScored();
        }
      }
    }

    this.ball.x += dx;
    this.ball.y += dy;

    if (this.ball.inGoal) {
      if (this.ball.x > 0.5) {
        this.ball.x = clamp(this.ball.x, 0.95, 0.97);
        this.ball.y = clamp(this.ball.y, 0.44, 0.56);
      } else {
        this.ball.x = clamp(this.ball.x, 0.03, 0.05);
        this.ball.y = clamp(this.ball.y, 0.44, 0.56);
      }
    } else {
      this.ball.x = clamp(this.ball.x, 0.05, 0.95);
      this.ball.y = clamp(this.ball.y, 0.02, 0.98);
    }
  }
}