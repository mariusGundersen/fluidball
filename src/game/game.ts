import { ClientToHost, HostToClient } from "../client";
import { PeerConnection } from "../PeerConnection";
import getWebGLContext from "./getWebGLContext";
import Player from "./Player";
import Renderer from "./Renderer";
import { clamp, dim, randomSplat, resizeCanvas } from "./utils";
import WebGLScreen from "./WebGLScreen";

export default function game(canvas: HTMLCanvasElement, peers: PeerConnection<HostToClient, ClientToHost>[]) {
  resizeCanvas(canvas);

  const aspectRatio = canvas.width / canvas.height;

  const { gl, ext } = getWebGLContext(canvas);

  const renderer = new Renderer(gl, ext);
  const screen = new WebGLScreen(gl);
  const players = peers.map((peer, index) => new Player(index * 0.6 + 0.2, 0.5, index * 2 / 3, peer));

  let lastUpdateTime = window.performance.now();

  requestAnimationFrame(update);

  function update(now: number) {
    const dt = (now - lastUpdateTime) / 1000;
    lastUpdateTime = now;

    applyInputs(players, renderer, aspectRatio, dt);

    renderer.step(dt);
    renderer.render(screen);
    requestAnimationFrame(update);
  }

  function multipleSplats(amount: number) {
    for (let i = 0; i < amount; i++) {
      const { x, y, dx, dy, color } = randomSplat();
      renderer.splat(x, y, dx, dy, color);
    }
  }

  multipleSplats(20);
}


function applyInputs(players: Player[], renderer: Renderer, aspectRatio: number, dt: number) {

  for (const player of players) {
    let dx = player.dx * dt;
    let dy = player.dy * dt * aspectRatio;

    let aimx = player.aimx;
    let aimy = player.aimy * aspectRatio;

    if (player.active) {
      renderer.splat(player.x, player.y, 0, 0, dim(player.color, 10), 5000);
    } else if (player.charge) {
      console.log('kick', player.charge, aimx, aimy);
      renderer.splat(player.x, player.y, player.charge * aimx, player.charge * aimy, player.color, 50);
      players[0].aimx = 0;
      players[0].aimy = 0;
    } else {
      renderer.splat(player.x, player.y, 0, 0, dim(player.color, 10), 5000);
    }

    if (dx * dy != 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }

    dx /= 10;
    dy /= 10;

    player.x += dx;
    player.y += dy;
    player.x = clamp(player.x, 0.01, 0.99);
    player.y = clamp(player.y, 0.01, 0.99);

    renderer.sourceDrain(player.x + aimx / 100, player.y + aimy / 100, player.active ? -150 : -5, player.color);

    if (player.active) {
      player.charge = Math.min(player.charge + dt / 16 * 1_000 * 50, 500);
      console.log(player.x, player.y);
    } else {
      player.charge = 0;
    }

    //player.elm.style.transform = `translate(${player.x * canvas.clientWidth}px, ${(1 - player.y) * canvas.clientHeight}px)`;
  }
}
