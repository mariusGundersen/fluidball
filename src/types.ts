import Quad from "./Quad";

export interface SampleSource extends Size {
  attach(id: number): number;
}

export interface Texture extends SampleSource {
  texture: WebGLTexture;
  getTextureScale(width: number, height: number): { x: number; y: number; };
}

export interface DrawTarget extends Size {
  drawTo(quad: Quad): void;
}

export interface FBO extends DrawTarget, SampleSource {
  readonly texture: WebGLTexture;
  readonly fbo: WebGLFramebuffer;
  readonly texelSizeX: number;
  readonly texelSizeY: number;
}

export interface Size {
  readonly width: number,
  readonly height: number
}

export interface CreateFboParams {
  readonly internalFormat: number,
  readonly format: number,
  readonly type: number,
  readonly linearOrNearest: number
}

export interface Color {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}