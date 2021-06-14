import createFBO from "./createFBO";
import { WebGLContext } from "./programs/Program";
import { CreateFboParams, FBO, Size } from "./types";


export interface DoubleFBO {
  width: number,
  height: number,
  texelSizeX: number,
  texelSizeY: number,
  read: FBO;
  write: FBO;
  swap(): void;
}

export default function createDoubleFBO(gl: WebGLContext, size: Size, params: CreateFboParams): DoubleFBO {
  let fbo1 = createFBO(gl, size, params);
  let fbo2 = createFBO(gl, size, params);

  return {
    ...size,
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