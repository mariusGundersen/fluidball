import bgImageUrl from 'url:./bg.jpg';
import ditheringImageUrl from 'url:./LDR_LLL1_0.png';
import config from './config';
import createDoubleFBO, { DoubleFBO } from './createDoubleFBO';
import createFBO from './createFBO';
import createTextureAsync from './createTextureAsync';
import { WebGlExtensions } from './getWebGLContext';
import Player from './Player';
import AdvectionProgram from './programs/AdvectionProgram';
import BallProgram from './programs/BallProgram';
import BaseWebGL from './programs/BaseWebGL';
import BloomProgram from './programs/BloomProgram';
import BlurProgram from './programs/BlurProgram';
import ColorProgram from './programs/ColorProgram';
import CopyProgram from './programs/CopyProgram';
import CurlProgram from './programs/CurlProgram';
import DisplayProgram from './programs/DisplayProgram';
import DivergenceProgram from './programs/DivergenceProgram';
import GradientSubtractProgram from './programs/GradientSubtractProgram';
import PressureProgram from './programs/PressureProgram';
import { WebGLContext } from './programs/Program';
import SplatProgram from './programs/SplatProgram';
import SunraysProgram from './programs/SunraysProgram';
import VorticityProgram from './programs/VorticityProgram';
import Quad from './Quad';
import { CreateFboParams, DrawTarget, FBO } from './types';
import { getResolution } from './utils';

export default class Renderer extends BaseWebGL {
  readonly ext: WebGlExtensions;
  readonly ditheringTexture = createTextureAsync(this.gl, ditheringImageUrl);
  readonly bgTexture = createTextureAsync(this.gl, bgImageUrl);
  readonly blurProgram = new BlurProgram(this.gl);
  readonly ballProgram = new BallProgram(this.gl);
  readonly colorProgram = new ColorProgram(this.gl);
  readonly copyProgram = new CopyProgram(this.gl);
  readonly bloomProgram = new BloomProgram(this.gl);
  readonly sunraysProgram = new SunraysProgram(this.gl);
  readonly displayProgram = new DisplayProgram(this.gl);
  readonly advectionProgram = new AdvectionProgram(this.gl);
  readonly divergenceProgram = new DivergenceProgram(this.gl);
  readonly curlProgram = new CurlProgram(this.gl);
  readonly vorticityProgram = new VorticityProgram(this.gl);
  readonly pressureProgram = new PressureProgram(this.gl);
  readonly gradienSubtractProgram = new GradientSubtractProgram(this.gl);
  readonly splatProgram = new SplatProgram(this.gl);
  readonly quad = new Quad(this.gl);
  readonly dye: DoubleFBO;
  readonly bloom: FBO;
  readonly sunrays: FBO;
  readonly sunraysTemp: FBO;
  readonly velocity: DoubleFBO;
  readonly divergence: FBO;
  readonly curl: FBO;
  readonly pressure: DoubleFBO;
  constructor(gl: WebGLContext, ext: WebGlExtensions) {
    super(gl);
    this.ext = ext;
    const dyeRes = getResolution(this.gl, config.DYE_RESOLUTION);
    const bloomRes = getResolution(this.gl, config.BLOOM_RESOLUTION);
    const sunraysRes = getResolution(this.gl, config.SUNRAYS_RESOLUTION);
    const simRes = getResolution(gl, config.SIM_RESOLUTION);

    const rgbaParams: CreateFboParams = {
      ...ext.formatRGBA,
      type: ext.halfFloatTexType,
      linearOrNearest: ext.supportLinearFiltering ? this.gl.LINEAR : this.gl.NEAREST
    }

    const rgParams: CreateFboParams = {
      ...ext.formatRG,
      type: ext.halfFloatTexType,
      linearOrNearest: ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST
    }

    const rParams: CreateFboParams = {
      ...ext.formatR,
      type: ext.halfFloatTexType,
      linearOrNearest: ext.supportLinearFiltering ? this.gl.LINEAR : this.gl.NEAREST
    }

    this.gl.disable(this.gl.BLEND);

    this.dye = createDoubleFBO(this.gl, dyeRes, rgbaParams);

    this.bloom = createFBO(this.gl, bloomRes, rgbaParams);

    this.bloomProgram.initBloomFramebuffers(bloomRes, rgbaParams, config.BLOOM_ITERATIONS);

    this.sunrays = createFBO(this.gl, sunraysRes, rParams);
    this.sunraysTemp = createFBO(this.gl, sunraysRes, rParams);


    this.velocity = createDoubleFBO(gl, simRes, rgParams);
    this.divergence = createFBO(gl, simRes, rParams);
    this.curl = createFBO(gl, simRes, rParams);
    this.pressure = createDoubleFBO(gl, simRes, rParams);
  }

  render(target: DrawTarget, ball: [number, number] = [0.5, 0.5], players: Player[] = []) {
    if (config.BLOOM)
      this.bloomProgram.run(this.dye.read, this.bloom, config, this.quad);
    if (config.SUNRAYS) {
      this.sunraysProgram.run(this.dye.read, this.dye.write, config.SUNRAYS_WEIGHT, ball, this.sunrays, this.quad);
      this.blurProgram.run(this.sunrays, this.sunraysTemp, 1, this.quad);
    }

    this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.enable(this.gl.BLEND);

    //this.colorProgram.run(target, { r: 0, g: 0, b: 0 }, this.quad);
    this.copyProgram.run(this.bgTexture, target, 1, this.quad);

    this.displayProgram.run(target, this.dye.read, this.bloom, this.ditheringTexture, this.sunrays, config, this.quad);
    this.ballProgram.run(target, ball, 0.015, { r: 0, g: 0, b: 0 }, this.quad);
    for (const player of players) {
      this.ballProgram.run(target, [player.x, player.y], player.radius, player.color, this.quad);
    }
  }

  step(dt: number) {
    this.gl.disable(this.gl.BLEND);

    this.curlProgram.run(this.velocity, this.curl, this.quad);

    this.vorticityProgram.run(this.velocity.read, config.CURL, this.curl, this.velocity.write, dt, this.quad);

    this.velocity.swap();

    this.divergenceProgram.run(this.velocity.read, this.divergence, this.quad);

    this.copyProgram.run(this.pressure.read, this.pressure.write, config.PRESSURE, this.quad);
    this.pressure.swap();
    this.pressureProgram.run(this.divergence, this.pressure, config.PRESSURE_ITERATIONS, this.quad);

    this.gradienSubtractProgram.run(this.velocity.read, this.pressure.read, this.velocity.write, this.quad);
    this.velocity.swap();

    this.advectionProgram.advectVelocity(this.velocity, !!this.ext.supportLinearFiltering, dt, config.VELOCITY_DISSIPATION, this.quad);

    this.advectionProgram.advectDye(this.velocity.read, this.dye, !!this.ext.supportLinearFiltering, config.DENSITY_DISSIPATION, this.quad);
    this.dye.swap();
  }

  reset() {
    this.colorProgram.run(this.velocity.read, { r: 0, g: 0, b: 0 }, this.quad);
    this.colorProgram.run(this.pressure.read, { r: 0, g: 0, b: 0 }, this.quad);
    this.colorProgram.run(this.dye.read, { r: 0, g: 0, b: 0 }, this.quad);
  }

  sourceDrain(x: number, y: number, p: number, { r, g, b }: { r: number; g: number; b: number; }) {
    const aspectRatio = 2;

    this.splatProgram.splat(this.pressure, [x, y], [p, 0, 0], config.SPLAT_RADIUS / 100, aspectRatio, this.quad);

    if (p > 0) {
      this.splatProgram.splat(this.dye, [x, y], [r, g, b], config.SPLAT_RADIUS / 100, aspectRatio, this.quad);
    }
  }

  splat(x: number, y: number, dx: number, dy: number, { r, g, b }: { r: number; g: number; b: number; }, radius = 100) {
    const aspectRatio = 2;

    this.splatProgram.splat(this.velocity, [x, y], [dx, dy, 0], config.SPLAT_RADIUS / radius, aspectRatio, this.quad);

    this.splatProgram.splat(this.dye, [x, y], [r, g, b], config.SPLAT_RADIUS / radius, aspectRatio, this.quad);
  }

  private readonly SIZE = 4;
  private readonly velocityPixels = new Float32Array(this.SIZE * this.SIZE * 4);
  getVelocityAt(x: number, y: number, dt: number) {
    const velocity = this.velocity;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, velocity.read.fbo);
    this.gl.readPixels(velocity.width * x - this.SIZE / 2, velocity.height * y - this.SIZE / 2, this.SIZE, this.SIZE, this.gl.RGBA, this.gl.FLOAT, this.velocityPixels);

    let vx = 0, vy = 0;
    for (let i = 0; i < this.velocityPixels.length; i += 4) {
      vx += this.velocityPixels[i];
      vy += this.velocityPixels[i + 1];
    }

    vx /= this.SIZE * this.SIZE;
    vy /= this.SIZE * this.SIZE;

    const dx = vx / velocity.width * dt;
    const dy = vy / velocity.height * dt;

    return { dx, dy };
  }
}
