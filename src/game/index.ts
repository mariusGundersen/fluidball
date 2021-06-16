import { io } from 'socket.io-client';
import Stats from "./fps";
import getWebGLContext from "./getWebGLContext";
import Quad from "./Quad";
import { Renderer } from './Renderer';
import startGUI, { isMobile } from "./startGUI";
import touchInput from './touchInput';
import { DrawTarget } from './types';
import { clamp, dim, generateColor, HSVtoRGB, scaleByPixelRatio } from "./utils";

// Simulation section

export const canvas = document.getElementsByTagName('canvas')[0];
resizeCanvas();

export let config = {
  SIM_RESOLUTION: 128,
  DYE_RESOLUTION: 1024,
  CAPTURE_RESOLUTION: 512,
  DENSITY_DISSIPATION: 0.3,
  VELOCITY_DISSIPATION: 0.3,
  PRESSURE: 0.8,
  PRESSURE_ITERATIONS: 20,
  CURL: 10,
  SPLAT_RADIUS: 0.25,
  SPLAT_FORCE: 6000,
  SHADING: true,
  COLORFUL: true,
  COLOR_UPDATE_SPEED: 10,
  PAUSED: false,
  BACK_COLOR: { r: 0, g: 50, b: 0 },
  TRANSPARENT: false,
  BLOOM: true,
  BLOOM_ITERATIONS: 8,
  BLOOM_RESOLUTION: 256,
  BLOOM_INTENSITY: 0.8,
  BLOOM_THRESHOLD: 0.6,
  BLOOM_SOFT_KNEE: 0.7,
  SUNRAYS: true,
  SUNRAYS_RESOLUTION: 196,
  SUNRAYS_WEIGHT: 1.0,
}

const updatePointers = touchInput(canvas);

const { gl, ext } = getWebGLContext(canvas);

if (isMobile()) {
  config.DYE_RESOLUTION = 512;
}

if (!ext.supportLinearFiltering) {
  config.DYE_RESOLUTION = 512;
  config.SHADING = false;
  config.BLOOM = false;
  config.SUNRAYS = false;
}

startGUI(config, {
  updateKeywords
});


const renderer = new Renderer(gl, ext);


function updateKeywords() {
  let displayKeywords = [];
  if (config.SHADING) displayKeywords.push("SHADING");
  if (config.BLOOM) displayKeywords.push("BLOOM");
  if (config.SUNRAYS) displayKeywords.push("SUNRAYS");
  renderer.displayProgram.setKeywords(displayKeywords);
}

updateKeywords();

export const ball = {
  x: 0.5,
  y: 0.5,
  elm: document.querySelector('.ball') as HTMLDivElement,
  inGoal: false,
};

interface Player {
  color: { r: number; g: number; b: number; };
  dy: number;
  dx: number;
  aimx: number,
  aimy: number,
  active: boolean,
  charge: number,
  x: number,
  y: number,
  elm: HTMLDivElement
}

const players: Player[] = [
  {
    x: 0.2,
    y: 0.5,
    dx: 0,
    dy: 0,
    aimx: 0,
    aimy: 0,
    active: false,
    charge: 0,
    elm: document.querySelector('#player1') as HTMLDivElement,
    color: HSVtoRGB(0, 0.9, 0.9) //{ r: 255, g: 1, b: 1 }
  },
  {
    x: 0.8,
    y: 0.5,
    dx: 0,
    dy: 0,
    aimx: 0,
    aimy: 0,
    active: false,
    charge: 0,
    elm: document.querySelector('#player2') as HTMLDivElement,
    color: HSVtoRGB(2 / 3, 0.9, 0.9)//{ r: 1, g: 1, b: 255 }
  }
];

const screen: DrawTarget = {
  get width() {
    return gl.drawingBufferWidth;
  },
  get height() {
    return gl.drawingBufferHeight;
  },
  drawTo(quad: Quad) {
    gl.viewport(0, 0, this.width, this.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    quad.draw();
  }
}

let lastUpdateTime = window.performance.now();

var stats = Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

requestAnimationFrame(update);

function update(now: number) {
  stats.begin()
  const dt = (now - lastUpdateTime) / 1000;
  lastUpdateTime = now;

  //if (resizeCanvas())
  //initFramebuffers();
  applyInputs(dt);
  if (!config.PAUSED && !document.hidden) {
    updateBall(dt)
    renderer.step(dt, renderer.dye);
  } else {
    console.log(dt);
  }
  renderer.render(screen);
  stats.end();
  requestAnimationFrame(update);
}

function updateBall(dt: number) {
  const velocity = renderer.velocity;
  const SIZE = 4;
  gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.read.fbo);
  var velocityPixels = new Float32Array(SIZE * SIZE * 4);
  gl.readPixels(velocity.width * ball.x - SIZE / 2, velocity.height * ball.y - SIZE / 2, SIZE, SIZE, gl.RGBA, gl.FLOAT, velocityPixels);

  let vx = 0, vy = 0;
  for (let i = 0; i < velocityPixels.length; i += 4) {
    vx += velocityPixels[i];
    vy += velocityPixels[i + 1];
  }

  vx /= SIZE * SIZE;
  vy /= SIZE * SIZE;

  const dx = vx / velocity.width * dt;
  const dy = vy / velocity.height * dt;

  if (!ball.inGoal) {
    if (ball.x < 0.95 && ball.x + dx > 0.95) {
      const y = ball.y + dy * (0.95 - ball.x) / dx;
      if (y > 0.44 && y < 0.56) {
        multipleSplats(20);
        ball.inGoal = true;
      }
    }
    if (ball.x > 0.05 && ball.x + dx < 0.05) {
      const y = ball.y + dy * (0.05 - ball.x) / dx;
      if (y > 0.44 && y < 0.56) {
        multipleSplats(20);
        ball.inGoal = true;
      }
    }
  }

  ball.x += dx;
  ball.y += dy;

  if (ball.inGoal) {
    if (ball.x > 0.5) {
      ball.x = clamp(ball.x, 0.95, 0.97);
      ball.y = clamp(ball.y, 0.44, 0.56);
    } else {
      ball.x = clamp(ball.x, 0.03, 0.05);
      ball.y = clamp(ball.y, 0.44, 0.56);
    }
  } else {
    ball.x = clamp(ball.x, 0.05, 0.95);
    ball.y = clamp(ball.y, 0.02, 0.98);
  }
  ball.elm.style.transform = `translate(${ball.x * canvas.clientWidth}px, ${(1 - ball.y) * canvas.clientHeight}px)`;
}

function resizeCanvas() {
  let width = scaleByPixelRatio(canvas.clientWidth);
  let height = scaleByPixelRatio(canvas.clientHeight);

  if (canvas.width != width || canvas.height != height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
}

var socket = io();
socket.on('move', (player: number, { x, y }: { x: number, y: number }) => {
  players[player].dx = x * 2;
  players[player].dy = y * 2;
});

socket.on('aim', (player: number, { x, y }: { x: number, y: number }) => {
  players[player].aimx = x;
  players[player].aimy = y;
  players[player].active = true;
});

socket.on('kick', (player: number) => {
  players[player].active = false;
})

function applyInputs(dt: number) {
  for (const { x, y, dx, dy, color } of updatePointers()) {
    renderer.splat(x, y, dx, dy, color);
  }

  const aspectRatio = canvas.width / canvas.height;

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

    player.elm.style.transform = `translate(${player.x * canvas.clientWidth}px, ${(1 - player.y) * canvas.clientHeight}px)`;
  }
}


function multipleSplats(amount: number) {
  for (let i = 0; i < amount; i++) {
    const color = generateColor();
    color.r *= 10.0;
    color.g *= 10.0;
    color.b *= 10.0;
    const x = Math.random();
    const y = Math.random();
    const dx = 1000 * (Math.random() - 0.5);
    const dy = 1000 * (Math.random() - 0.5);
    renderer.splat(x, y, dx, dy, color);
  }
}
