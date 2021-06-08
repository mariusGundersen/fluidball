import { hashCode } from "./utils.js";

export type WebGLContext = WebGL2RenderingContext | WebGLRenderingContext;

export default class Material {
  vertexShader: WebGLShader;
  fragmentShaderSource: string;
  programs: WebGLProgram[];
  activeProgram!: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation>;
  gl: WebGLContext;
  constructor(gl: WebGLContext, vertexShader: WebGLShader, fragmentShaderSource: string) {
    this.gl = gl;
    this.vertexShader = vertexShader;
    this.fragmentShaderSource = fragmentShaderSource;
    this.programs = [];
    this.uniforms = {};
  }

  setKeywords(keywords: string[]) {
    let hash = 0;
    for (let i = 0; i < keywords.length; i++)
      hash += hashCode(keywords[i]);

    let program = this.programs[hash];
    if (program == null) {
      let fragmentShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
      program = createProgram(this.gl, this.vertexShader, fragmentShader);
      this.programs[hash] = program;
    }

    if (program == this.activeProgram)
      return;

    this.uniforms = getUniforms(this.gl, program);
    this.activeProgram = program;
  }

  bind() {
    this.gl.useProgram(this.activeProgram);
  }
}

export class Program {
  uniforms: Record<string, WebGLUniformLocation>;
  program: WebGLProgram | null;
  gl: WebGLContext;
  constructor(gl: WebGLContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
    this.gl = gl;
    this.uniforms = {};
    this.program = createProgram(gl, vertexShader, fragmentShader);
    this.uniforms = getUniforms(gl, this.program);
  }

  bind() {
    this.gl.useProgram(this.program);
  }
}

export function createProgram(gl: WebGLContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
  let program = gl.createProgram();

  if (!program) throw new Error("Could not make program");

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    console.trace(gl.getProgramInfoLog(program));

  return program;
}

export function getUniforms(gl: WebGLContext, program: WebGLProgram) {
  let uniforms: Record<string, WebGLUniformLocation> = {};
  let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < uniformCount; i++) {
    let uniformName = gl.getActiveUniform(program, i)?.name as string;
    uniforms[uniformName] = gl.getUniformLocation(program, uniformName) as WebGLUniformLocation;
  }
  return uniforms;
}

export function compileShader(gl: WebGLContext, type: number, source: string, keywords?: string[]) {
  source = addKeywords(source, keywords);

  const shader = gl.createShader(type);

  if (!shader) throw new Error("Could not make shader");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    console.trace(gl.getShaderInfoLog(shader));

  return shader;
};

function addKeywords(source: string, keywords?: string[]) {
  if (!keywords) return source;

  let keywordsString = '';
  keywords.forEach((keyword: string) => {
    keywordsString += '#define ' + keyword + '\n';
  });
  return keywordsString + source;
}