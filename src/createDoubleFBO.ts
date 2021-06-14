import createFBO, { FBO } from "./createFBO";
import { WebGLContext } from "./Material";


export interface DoubleFBO {
  width: number,
  height: number,
  texelSizeX: number,
  texelSizeY: number,
  read: FBO;
  write: FBO;
  swap(): void;
}

export default function createDoubleFBO(gl: WebGLContext, w: number, h: number, internalFormat: any, format: any, type: any, param: any): DoubleFBO {
  let fbo1 = createFBO(gl, w, h, internalFormat, format, type, param);
  let fbo2 = createFBO(gl, w, h, internalFormat, format, type, param);

  return {
    width: w,
    height: h,
    texelSizeX: fbo1.texelSizeX,
    texelSizeY: fbo1.texelSizeY,
    get read() {
      return fbo1;
    },
    set read(value) {
      fbo1 = value;
    },
    get write() {
      return fbo2;
    },
    set write(value) {
      fbo2 = value;
    },
    swap() {
      let temp = fbo1;
      fbo1 = fbo2;
      fbo2 = temp;
    }
  }
}