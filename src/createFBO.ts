import { WebGLContext } from "./programs/Program";
import Quad from "./Quad";
import { CreateFboParams, FBO, Size } from "./types";

export default function createFBO(gl: WebGLContext, { width, height }: Size, { internalFormat, format, type, linearOrNearest }: CreateFboParams): FBO {
  gl.activeTexture(gl.TEXTURE0);
  let texture = gl.createTexture();
  if (!texture) throw new Error("Could not make texture");

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linearOrNearest);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linearOrNearest);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

  let fbo = gl.createFramebuffer();
  if (!fbo) throw new Error("Could not make framebuffer");

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.viewport(0, 0, width, height);
  gl.clear(gl.COLOR_BUFFER_BIT);

  let texelSizeX = 1.0 / width;
  let texelSizeY = 1.0 / height;

  return {
    texture,
    fbo,
    width,
    height,
    texelSizeX,
    texelSizeY,
    attach(id: number) {
      gl.activeTexture(gl.TEXTURE0 + id);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      return id;
    },
    drawTo(quad: Quad) {
      gl.viewport(0, 0, width, height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      quad.draw();
    }
  };
}
