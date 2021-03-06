import Quad from "../Quad";
import { FBO } from "../types";
import { glsl } from "../utils";
import { Program, WebGLContext } from "./Program";
import { vertexShader } from "./vertexShader";

const vorticityShader = glsl`${`
  precision highp float;
  precision highp sampler2D;

  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;

  void main () {
    float L = texture2D(uCurl, vL).x;
    float R = texture2D(uCurl, vR).x;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;

    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= curl * C;
    force.y *= -1.0;

    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity += force * dt;
    velocity = clamp(velocity, -1000.0, 1000.0);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`}`;

export default class VorticityProgram extends Program<typeof vertexShader, typeof vorticityShader> {
  constructor(gl: WebGLContext) {
    super(gl, vertexShader, vorticityShader)
  }

  run(source: FBO, curlicity: number, curl: FBO, target: FBO, dt: number, quad: Quad) {
    this.bind();
    this.uniforms.texelSize = [source.texelSizeX, source.texelSizeY];
    this.uniforms.uVelocity = source.attach(0);
    this.uniforms.uCurl = curl.attach(1);
    this.uniforms.curl = curlicity;
    this.uniforms.dt = dt;
    target.drawTo(quad);
  }
}