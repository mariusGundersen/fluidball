import { WebGLContext } from "./Material";

export interface Texture {
  texture: WebGLTexture,
  width: number,
  height: number,
  attach(id: number): number;
  getTextureScale(width: number, height: number): { x: number, y: number }
}

export default function createTextureAsync(gl: WebGLContext, url: string): Texture {
  let texture = gl.createTexture();

  if (!texture)
    throw new Error("could not make texture");

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255]));

  let obj = {
    texture,
    width: 1,
    height: 1,
    attach(id: number) {
      gl.activeTexture(gl.TEXTURE0 + id);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      return id;
    },
    getTextureScale(width: number, height: number) {
      return getTextureScale(this, width, height)
    }
  };

  let image = new Image();
  image.onload = () => {
    obj.width = image.width;
    obj.height = image.height;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  };
  image.src = url;

  return obj;
}


function getTextureScale(texture: Texture, width: number, height: number) {
  return {
    x: width / texture.width,
    y: height / texture.height
  };
}