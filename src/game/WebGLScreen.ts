import BaseWebGL from './programs/BaseWebGL';
import Quad from "./Quad";
import { DrawTarget } from './types';

export default class WebGLScreen extends BaseWebGL implements DrawTarget {
  get width() {
    return this.gl.drawingBufferWidth;
  }
  get height() {
    return this.gl.drawingBufferHeight;
  }
  drawTo(quad: Quad) {
    this.gl.viewport(0, 0, this.width, this.height);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    quad.draw();
  }
}
