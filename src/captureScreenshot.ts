export default function captureScreenshot() {
  let res = getResolution(config.CAPTURE_RESOLUTION);
  let target = createFBO(res.width, res.height, ext.formatRGBA.internalFormat, ext.formatRGBA.format, ext.halfFloatTexType, gl.NEAREST);
  render(target);

  let texture = framebufferToTexture(target);
  texture = normalizeTexture(texture, target.width, target.height);

  let captureCanvas = textureToCanvas(texture, target.width, target.height);
  let datauri = captureCanvas.toDataURL();
  downloadURI('fluid.png', datauri);
  URL.revokeObjectURL(datauri);
}

function framebufferToTexture(target: { texture?: any; fbo: any; width: any; height: any; texelSizeX?: number; texelSizeY?: number; attach?: (id: any) => any; }) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
  let length = target.width * target.height * 4;
  let texture = new Float32Array(length);
  gl.readPixels(0, 0, target.width, target.height, gl.RGBA, gl.FLOAT, texture);
  return texture;
}

function normalizeTexture(texture: any[] | Float32Array, width: number, height: number) {
  let result = new Uint8Array(texture.length);
  let id = 0;
  for (let i = height - 1; i >= 0; i--) {
    for (let j = 0; j < width; j++) {
      let nid = i * width * 4 + j * 4;
      result[nid + 0] = clamp01(texture[id + 0]) * 255;
      result[nid + 1] = clamp01(texture[id + 1]) * 255;
      result[nid + 2] = clamp01(texture[id + 2]) * 255;
      result[nid + 3] = clamp01(texture[id + 3]) * 255;
      id += 4;
    }
  }
  return result;
}

function clamp01(input: number) {
  return Math.min(Math.max(input, 0), 1);
}

function textureToCanvas(texture: ArrayLike<number>, width: number, height: number) {
  let captureCanvas = document.createElement('canvas');
  let ctx = captureCanvas.getContext('2d');

  if (!ctx) throw new Error("could not make 2d context")

  captureCanvas.width = width;
  captureCanvas.height = height;

  let imageData = ctx.createImageData(width, height);
  imageData.data.set(texture);
  ctx.putImageData(imageData, 0, 0);

  return captureCanvas;
}

function downloadURI(filename: string, uri: string) {
  let link = document.createElement('a');
  link.download = filename;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}