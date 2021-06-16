import createFBO from "../createFBO";
import Quad from "../Quad";
import { CreateFboParams, FBO, Size } from "../types";
import { glsl } from "../utils";
import { Program, WebGLContext } from "./Program";
import { vertexShader } from "./vertexShader";
import WebGl from "./WebGl";

const bloomPrefilterShader = glsl`${`
  precision mediump float;
  precision mediump sampler2D;

  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform vec3 curve;
  uniform float threshold;

  void main () {
    vec3 c = texture2D(uTexture, vUv).rgb;
    float br = max(c.r, max(c.g, c.b));
    float rq = clamp(br - curve.x, 0.0, curve.y);
    rq = curve.z * rq * rq;
    c *= max(rq, br - threshold) / max(br, 0.0001);
    gl_FragColor = vec4(c, 0.0);
  }
`}`;

const bloomBlurShader = glsl`${`
  precision mediump float;
  precision mediump sampler2D;

  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uTexture;

  void main () {
    vec4 sum = vec4(0.0);
    sum += texture2D(uTexture, vL);
    sum += texture2D(uTexture, vR);
    sum += texture2D(uTexture, vT);
    sum += texture2D(uTexture, vB);
    sum *= 0.25;
    gl_FragColor = sum;
  }
`}`;

const bloomFinalShader = glsl`${`
  precision mediump float;
  precision mediump sampler2D;

  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uTexture;
  uniform float intensity;

  void main () {
    vec4 sum = vec4(0.0);
    sum += texture2D(uTexture, vL);
    sum += texture2D(uTexture, vR);
    sum += texture2D(uTexture, vT);
    sum += texture2D(uTexture, vB);
    sum *= 0.25;
    gl_FragColor = sum * intensity;
  }
`}`;

export interface BloomConfig {
  BLOOM_THRESHOLD: number,
  BLOOM_SOFT_KNEE: number,
  BLOOM_INTENSITY: number
}

export default class BloomProgram extends WebGl {
  private framebuffers: FBO[] = [];
  bloomPrefilterProgram = new Program(this.gl, vertexShader, bloomPrefilterShader);
  bloomBlurProgram = new Program(this.gl, vertexShader, bloomBlurShader);
  bloomFinalProgram = new Program(this.gl, vertexShader, bloomFinalShader);
  constructor(gl: WebGLContext) {
    super(gl);
  }

  initBloomFramebuffers(res: Size, params: CreateFboParams, iterations: number) {
    while (this.framebuffers.length > 0) {
      this.gl.deleteTexture(this.framebuffers.shift()!.texture);
    }

    for (let i = 0; i < iterations; i++) {
      let width = res.width >> (i + 1);
      let height = res.height >> (i + 1);

      if (width < 2 || height < 2) break;

      let fbo = createFBO(this.gl, res, params);
      this.framebuffers.push(fbo);
    }
  }

  run(source: FBO, destination: FBO, config: BloomConfig, quad: Quad) {
    if (this.framebuffers.length < 2)
      return;

    let last = destination;

    this.gl.disable(this.gl.BLEND);
    this.bloomPrefilterProgram.bind();
    let knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
    let curve0 = config.BLOOM_THRESHOLD - knee;
    let curve1 = knee * 2;
    let curve2 = 0.25 / knee;
    this.bloomPrefilterProgram.uniforms.curve = [curve0, curve1, curve2];
    this.bloomPrefilterProgram.uniforms.threshold = config.BLOOM_THRESHOLD;
    this.bloomPrefilterProgram.uniforms.uTexture = source.attach(0);
    last.drawTo(quad);

    this.bloomBlurProgram.bind();
    for (let i = 0; i < this.framebuffers.length; i++) {
      let dest = this.framebuffers[i];
      this.bloomBlurProgram.uniforms.texelSize = [last.texelSizeX, last.texelSizeY];
      this.bloomBlurProgram.uniforms.uTexture = last.attach(0);
      dest.drawTo(quad);
      last = dest;
    }

    this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
    this.gl.enable(this.gl.BLEND);

    for (let i = this.framebuffers.length - 2; i >= 0; i--) {
      let baseTex = this.framebuffers[i];
      this.bloomBlurProgram.uniforms.texelSize = [last.texelSizeX, last.texelSizeY];
      this.bloomBlurProgram.uniforms.uTexture = last.attach(0);
      this.gl.viewport(0, 0, baseTex.width, baseTex.height);
      baseTex.drawTo(quad);
      last = baseTex;
    }

    this.gl.disable(this.gl.BLEND);
    this.bloomFinalProgram.bind();
    this.bloomFinalProgram.uniforms.texelSize = [last.texelSizeX, last.texelSizeY];
    this.bloomFinalProgram.uniforms.uTexture = last.attach(0);
    this.bloomFinalProgram.uniforms.intensity = config.BLOOM_INTENSITY;
    destination.drawTo(quad);
  }

}