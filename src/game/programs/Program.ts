
export type WebGLContext = WebGL2RenderingContext | WebGLRenderingContext;

export class Program<VS extends string, FS extends string> {
  readonly uniforms: GetAllUniforms<VS> & GetAllUniforms<FS>;
  readonly program: WebGLProgram | null;
  readonly gl: WebGLContext;
  readonly vertexShader: WebGLShader;
  readonly fragmentShader: WebGLShader;
  constructor(gl: WebGLContext, vertexShader: VS, fragmentShader: FS) {
    this.gl = gl;
    this.vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShader);
    this.fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
    this.program = createProgram(gl, this.vertexShader, this.fragmentShader);
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
  const uniforms: any = {};
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < uniformCount; i++) {
    const { name, type } = gl.getActiveUniform(program, i) as WebGLActiveInfo;
    const location = gl.getUniformLocation(program, name) as WebGLUniformLocation;

    Object.defineProperty(uniforms, name, {
      get() {
        return gl.getUniform(program, location);
      },
      set(v: any) {
        switch (type) {
          case gl.FLOAT:
            return gl.uniform1f(location, v);
          case gl.INT:
          case gl.SAMPLER_2D:
            return gl.uniform1i(location, v);
          case gl.FLOAT_VEC2:
            return gl.uniform2f(location, v[0], v[1]);
          case gl.FLOAT_VEC3:
            return gl.uniform3f(location, v[0], v[1], v[2]);
          case gl.FLOAT_VEC4:
            return gl.uniform4f(location, v[0], v[1], v[2], v[3]);
          default:
            throw new Error(`Not implemented for type ${type} (${name})`);
        }
      }
    });
  }
  return uniforms;
}

export function compileShader<Source extends string>(gl: WebGLContext, type: number, source: Source, keywords?: string[]): WebGLShader {
  const shader = gl.createShader(type);

  if (!shader) throw new Error("Could not make shader");

  gl.shaderSource(shader, addKeywords(source, keywords));
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