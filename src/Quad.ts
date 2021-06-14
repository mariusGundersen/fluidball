import { FBO } from "./createFBO";
import { WebGLContext } from "./Material";

export default class Quad {
  gl: WebGLContext;
  constructor(gl: WebGLContext) {
    this.gl = gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
  }

  blit(target: FBO | null) {
    if (target == null) {
      this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    } else {
      this.gl.viewport(0, 0, target.width, target.height);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.fbo);
    }
  }

  draw() {
    this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
  }
}
