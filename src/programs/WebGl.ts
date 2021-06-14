import { WebGLContext } from "./Program";

export default class WebGl {
  readonly gl: WebGLContext;
  constructor(gl: WebGLContext) {
    this.gl = gl;
  }
}