import { FBO } from "../createFBO";
import Quad from "../Quad";
import { glsl } from "../utils";
import { Program, WebGLContext } from "./Program";
import { vertexShader } from "./vertexShader";
import WebGl from "./WebGl";

const sunraysMaskShader = glsl`${`
  precision highp float;
  precision highp sampler2D;

  varying vec2 vUv;
  uniform sampler2D uTexture;

  void main () {
    vec4 c = texture2D(uTexture, vUv);
    float br = max(c.r, max(c.g, c.b));
    c.a = 1.0 - clamp(br * 20.0, 0.0, 0.8);
    gl_FragColor = c;
  }
`}`;

const sunraysShader = glsl`${`
  precision highp float;
  precision highp sampler2D;

  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float weight;
  uniform vec2 center;

  #define ITERATIONS 16

  void main () {
    float Density = 0.3;
    float Decay = 0.95;
    float Exposure = 0.7;

    vec2 coord = vUv;
    vec2 dir = vUv - center;

    dir *= 1.0 / float(ITERATIONS) * Density;
    float illuminationDecay = 1.0;

    float color = texture2D(uTexture, vUv).a;

    for (int i = 0; i < ITERATIONS; i++)
    {
      coord -= dir;
      float col = texture2D(uTexture, coord).a;
      color += col * illuminationDecay * weight;
      illuminationDecay *= Decay;
    }

    gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);
  }
`}`;

export default class SunraysProgram extends WebGl {
  sunraysMaskProgram = new Program(this.gl, vertexShader, sunraysMaskShader);
  sunraysProgram = new Program(this.gl, vertexShader, sunraysShader);
  constructor(gl: WebGLContext) {
    super(gl);
  }

  run(source: FBO, mask: FBO, weight: number, [x, y]: [number, number], destination: FBO, quad: Quad) {
    this.gl.disable(this.gl.BLEND);
    this.sunraysMaskProgram.bind();
    this.sunraysMaskProgram.uniforms.uTexture = source.attach(0);
    mask.drawTo(quad);

    this.sunraysProgram.bind();
    this.sunraysProgram.uniforms.weight = weight;
    this.sunraysProgram.uniforms.uTexture = mask.attach(0);
    this.sunraysProgram.uniforms.center = [x, y];
    destination.drawTo(quad);
  }
}