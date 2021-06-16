import { WebGLContext } from "./programs/Program";
import { Color } from "./types";

export function correctDeltaX(canvas: { width: number, height: number }, delta: number) {
  let aspectRatio = canvas.width / canvas.height;
  if (aspectRatio < 1) delta *= aspectRatio;
  return delta;
}

export function correctDeltaY(canvas: { width: number, height: number }, delta: number) {
  let aspectRatio = canvas.width / canvas.height;
  if (aspectRatio > 1) delta /= aspectRatio;
  return delta;
}

export function generateColor() {
  let c = HSVtoRGB(Math.random(), 1.0, 1.0);
  c.r *= 0.15;
  c.g *= 0.15;
  c.b *= 0.15;
  return c;
}

export function dim({ r, g, b }: Color, v = 4) {
  return {
    r: r / v,
    g: g / v,
    b: b / v
  }
}

export function HSVtoRGB(h: number, s: number, v: number) {
  let r = 0, g = 0, b = 0, i, f, p, q, t;
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }

  return {
    r,
    g,
    b
  };
}

export function normalizeColor({ r, g, b }: Color) {
  return {
    r: r / 255,
    g: g / 255,
    b: b / 255
  };
}

export function wrap(value: number, min: number, max: number) {
  let range = max - min;
  if (range == 0) return min;
  return (value - min) % range + min;
}

export function scaleByPixelRatio(input: number) {
  let pixelRatio = window.devicePixelRatio || 1;
  return Math.floor(input * pixelRatio);
}

export function hashCode(s: string) {
  if (s.length == 0) return 0;
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

export function getResolution(gl: WebGLContext, resolution: number) {
  let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
  if (aspectRatio < 1)
    aspectRatio = 1.0 / aspectRatio;

  let min = Math.round(resolution);
  let max = Math.round(resolution * aspectRatio);

  if (gl.drawingBufferWidth > gl.drawingBufferHeight)
    return { width: max, height: min };
  else
    return { width: min, height: max };
}

export function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(v, max));
}

export function glsl<T>(_: TemplateStringsArray, ...strings: [T]): T {
  return strings[0];
}

export function resizeCanvas(canvas: HTMLCanvasElement) {
  let width = scaleByPixelRatio(canvas.clientWidth);
  let height = scaleByPixelRatio(canvas.clientHeight);

  if (canvas.width != width || canvas.height != height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
}

export function randomSplat() {
  const color = generateColor();
  color.r *= 10.0;
  color.g *= 10.0;
  color.b *= 10.0;
  const x = Math.random();
  const y = Math.random();
  const dx = 1000 * (Math.random() - 0.5);
  const dy = 1000 * (Math.random() - 0.5);
  return { x, y, dx, dy, color };
}