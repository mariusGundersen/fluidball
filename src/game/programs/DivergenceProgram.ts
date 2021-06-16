import Quad from "../Quad";
import { FBO } from "../types";
import { glsl } from "../utils";
import { Program, WebGLContext } from "./Program";
import { vertexShader } from "./vertexShader";

const divergenceShader = glsl`${`
  precision mediump float;
  precision mediump sampler2D;

  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;

  void main () {
    float L = texture2D(uVelocity, vL).x;
    float R = texture2D(uVelocity, vR).x;
    float T = texture2D(uVelocity, vT).y;
    float B = texture2D(uVelocity, vB).y;

    vec2 C = texture2D(uVelocity, vUv).xy;
    if (vL.x < 0.0) { L = -C.x; }
    if (vR.x > 1.0) { R = -C.x; }
    if (vT.y > 1.0) { T = -C.y; }
    if (vB.y < 0.0) { B = -C.y; }

    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`}`;

export default class DivergenceProgram extends Program<typeof vertexShader, typeof divergenceShader> {
  constructor(gl: WebGLContext) {
    super(gl, vertexShader, divergenceShader);
  }

  run(source: FBO, target: FBO, quad: Quad) {
    this.bind();
    this.uniforms.texelSize = [source.texelSizeX, source.texelSizeY];
    this.uniforms.uVelocity = source.attach(0);
    target.drawTo(quad);
  }
}