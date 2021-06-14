import Quad from "../Quad";
import { DrawTarget, SampleSource } from "../types";
import { glsl } from "../utils";
import { Program, WebGLContext } from "./Program";
import { vertexShader } from "./vertexShader";

const clearShader = glsl`${`
  precision mediump float;
  precision mediump sampler2D;

  varying highp vec2 vUv;
  uniform sampler2D uTexture;
  uniform float value;

  void main () {
    gl_FragColor = value * texture2D(uTexture, vUv);
  }
`}`;

export default class CopyProgram extends Program<typeof vertexShader, typeof clearShader>{
  constructor(gl: WebGLContext) {
    super(gl, vertexShader, clearShader);
  }

  run(source: SampleSource, target: DrawTarget, value: number, quad: Quad) {
    this.bind();
    this.uniforms.uTexture = source.attach(0);
    this.uniforms.value = value;
    target.drawTo(quad);
  }
}