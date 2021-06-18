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

  removePlayerAt(index: number) {
    this.players.splice(index, 1);
  }

  addPlayer(peer: HostConnection) {
    const index = this.players.length;
    this.players.push(new Player(index * 0.6 + 0.2, 0.5, (index * 2) / 3, peer));
  }

  reset() {
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
    requestAnimationFrame(now => this.update(now));
  }


  applyInputs(aspectRatio: number, dt: number) {

    for (const player of this.players) {
      let dx = player.dx * dt;
      let dy = player.dy * dt * aspectRatio;

      let aimx = player.aimx;
      let aimy = player.aimy * aspectRatio;

      const distX = player.x - this.ball.x;
      const distY = player.y - this.ball.y;

      if (player.charge > 500 && Math.sqrt(distX * distX + distY * distY) < 0.03) {
        player.active = false;
      }

      if (player.active) {
        this.renderer.splat(player.x, player.y, 0, 0, dim(player.color, 10), 5000);
      } else if (player.charge) {
        console.log('kick', player.charge, aimx, aimy);
        this.renderer.splat(player.x, player.y, player.charge * aimx, player.charge * aimy, player.color, 50);
        this.players[0].aimx = 0;
        this.players[0].aimy = 0;
      } else {
        this.renderer.splat(player.x, player.y, 0, 0, dim(player.color, 10), 5000);
      }

      if (dx * dy != 0) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
      }

      dx /= 10;
      dy /= 10;

      player.x += dx;
      player.y += dy;
      player.x = clamp(player.x, 0.10, 0.90);
      player.y = clamp(player.y, 0.01, 0.99);

      this.renderer.sourceDrain(player.x + aimx / 100, player.y + aimy / 100, player.active ? -150 : -5, player.color);

      if (player.active) {
        player.charge = Math.min(510, player.charge + dt / 16 * 1_000 * 50);
      } else {
        player.charge = 0;
      }

      //player.elm.style.transform = `translate(${player.x * canvas.clientWidth}px, ${(1 - player.y) * canvas.clientHeight}px)`;
    }
  }

  updateBall(dt: number) {
    const { dx, dy } = this.renderer.getVelocityAt(this.ball.x, this.ball.y, dt);


    if (!this.ball.inGoal) {
      if (this.ball.x < 0.95 && this.ball.x + dx > 0.95) {
        const y = this.ball.y + dy * (0.95 - this.ball.x) / dx;
        if (y > 0.44 && y < 0.56) {
          this.multipleSplats(20);
          this.ball.inGoal = true;
          setTimeout(() => this.reset(), 3000);
        }
      }
      if (this.ball.x > 0.05 && this.ball.x + dx < 0.05) {
        const y = this.ball.y + dy * (0.05 - this.ball.x) / dx;
        if (y > 0.44 && y < 0.56) {
          this.multipleSplats(20);
          this.ball.inGoal = true;
          setTimeout(() => this.reset(), 3000);
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
    //this.ball.elm.style.transform = `translate(${this.ball.x * canvas.clientWidth}px, ${(1 - this.ball.y) * canvas.clientHeight}px)`;
  }
}