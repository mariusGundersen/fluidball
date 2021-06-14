import { DoubleFBO } from "../createDoubleFBO";
import Quad from "../Quad";
import { FBO } from "../types";
import { glsl } from "../utils";
import { Program, WebGLContext } from "./Program";
import { vertexShader } from "./vertexShader";

const curlFragmentShader = glsl`${`
  precision mediump float;
  precision mediump sampler2D;

  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;

  void main () {
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    float vorticity = R - L - T + B;
    gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
  }
`}`;

export default class CurlProgram extends Program<typeof vertexShader, typeof curlFragmentShader> {
  constructor(gl: WebGLContext) {
    super(gl, vertexShader, curlFragmentShader);
  }

  run(velocity: DoubleFBO, target: FBO, quad: Quad) {
    this.bind();
    this.uniforms.texelSize = [velocity.texelSizeX, velocity.texelSizeY];
    this.uniforms.uVelocity = velocity.read.attach(0);
    target.drawTo(quad);
  }
}