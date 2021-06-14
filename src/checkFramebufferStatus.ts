import { WebGLContext } from "./programs/Program";

export default function checkFramebufferStatus(gl: WebGLContext) {
  let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status != gl.FRAMEBUFFER_COMPLETE)
    console.trace("Framebuffer error: " + status);
}
