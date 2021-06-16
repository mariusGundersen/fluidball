import { DoubleFBO } from "../createDoubleFBO";
import Quad from "../Quad";
import { FBO } from "../types";
import { glsl } from "../utils";
import { Program, WebGLContext } from "./Program";
import { vertexShader } from "./vertexShader";

const pressureShader = glsl`${`
  precision mediump float;
  precision mediump sampler2D;

  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;

  void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    float C = texture2D(uPressure, vUv).x;
    float divergence = texture2D(uDivergence, vUv).x;
    float pressure = (L + R + B + T - divergence) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`}`;

export default class PressureProgram extends Program<typeof vertexShader, typeof pressureShader> {
  constructor(gl: WebGLContext) {
    super(gl, vertexShader, pressureShader);
  }

  run(divergence: FBO, pressure: DoubleFBO, iterations: number, quad: Quad) {
    this.bind();
    this.uniforms.texelSize = [pressure.texelSizeX, pressure.texelSizeY];
    this.uniforms.uDivergence = divergence.attach(0);
    for (let i = 0; i < iterations; i++) {
      this.uniforms.uPressure = pressure.read.attach(1);
      pressure.write.drawTo(quad);
      pressure.swap();
    }
  }
}