import { DrawTarget } from "../createFBO";
import Quad from "../Quad";
import { glsl } from "../utils";
import { Program, WebGLContext } from "./Program";
import { vertexShader } from "./vertexShader";

const colorFragmentShader = glsl`${`
  precision mediump float;

  uniform vec4 color;

  void main () {
    gl_FragColor = color;
  }
`}`;

export default class ColorProgram extends Program<typeof vertexShader, typeof colorFragmentShader> {
  constructor(gl: WebGLContext) {
    super(gl, vertexShader, colorFragmentShader);
  }

  run(target: DrawTarget, color: { r: any; g: any; b: any; }, quad: Quad) {
    this.bind();
    this.uniforms.color = [color.r, color.g, color.b, 1];
    target.drawTo(quad);
  }
}