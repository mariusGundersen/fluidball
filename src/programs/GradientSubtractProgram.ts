import Quad from "../Quad";
import { FBO } from "../types";
import { glsl } from "../utils";
import { Program, WebGLContext } from "./Program";
import { vertexShader } from "./vertexShader";

const gradientSubtractShader = glsl`${`
precision mediump float;
precision mediump sampler2D;

varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;

void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity.xy -= vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`}`;

export default class GradientSubtractProgram extends Program<typeof vertexShader, typeof gradientSubtractShader> {
  constructor(gl: WebGLContext) {
    super(gl, vertexShader, gradientSubtractShader);
  }

  run(velocity: FBO, pressure: FBO, target: FBO, quad: Quad) {
    this.bind();
    this.uniforms.texelSize = [velocity.texelSizeX, velocity.texelSizeY];
    this.uniforms.uPressure = pressure.attach(0);
    this.uniforms.uVelocity = velocity.attach(1);
    target.drawTo(quad);
  }
}