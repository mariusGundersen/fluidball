import { WebGLContext } from "./Program";

export default abstract class BaseWebGL {
  readonly gl: WebGLContext;
  constructor(gl: WebGLContext) {
    this.gl = gl;
  }
}