import { DoubleFBO } from "../createDoubleFBO";
import Quad from "../Quad";
import { FBO } from "../types";
import { glsl } from "../utils";
import { Program, WebGLContext } from "./Program";
import { vertexShader } from "./vertexShader";

const advectionShader = glsl`${`
  precision highp float;
  precision highp sampler2D;

  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform vec2 dyeTexelSize;
  uniform float dt;
  uniform float dissipation;

  vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
    vec2 st = uv / tsize - 0.5;

    vec2 iuv = floor(st);
    vec2 fuv = fract(st);

    vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
    vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
    vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
    vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

    return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
  }

  void main () {
    #ifdef MANUAL_FILTERING
      vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
      vec4 result = bilerp(uSource, coord, dyeTexelSize);
    #else
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
      vec4 result = texture2D(uSource, coord);
    #endif
    float decay = 1.0 + dissipation * dt;
    gl_FragColor = result / decay;
  }
`}`;

export default class AdvectionProgram extends Program<typeof vertexShader, typeof advectionShader> {
  constructor(gl: WebGLContext) {
    super(gl, vertexShader, advectionShader);
  }

  advectVelocity(velocity: DoubleFBO, supportLinearFiltering: boolean, dt: number, dissipation: number, quad: Quad) {
    this.bind();
    this.uniforms.texelSize = [velocity.texelSizeX, velocity.texelSizeY];
    if (!supportLinearFiltering)
      this.uniforms.dyeTexelSize = [velocity.texelSizeX, velocity.texelSizeY];
    this.uniforms.uVelocity = this.uniforms.uSource = velocity.read.attach(0);
    this.uniforms.dt = dt;
    this.uniforms.dissipation = dissipation;
    velocity.write.drawTo(quad);
    velocity.swap();
  }

  advectDye(velocity: FBO, dye: DoubleFBO, supportLinearFiltering: boolean, dissipation: number, quad: Quad) {
    if (!supportLinearFiltering)
      this.uniforms.dyeTexelSize = [dye.texelSizeX, dye.texelSizeY];
    this.uniforms.uVelocity = velocity.attach(0);
    this.uniforms.uSource = dye.read.attach(1);
    this.uniforms.dissipation = dissipation;
    dye.write.drawTo(quad);
  }
}