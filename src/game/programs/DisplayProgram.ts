import Quad from "../Quad";
import { DrawTarget, FBO, Texture } from "../types";
import { glsl, hashCode } from "../utils";
import { compileShader, createProgram, Program, WebGLContext } from "./Program";
import { vertexShader } from "./vertexShader";


const displayShaderSource = glsl`${`
  precision highp float;
  precision highp sampler2D;

  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uTexture;
  uniform sampler2D uBloom;
  uniform sampler2D uSunrays;
  uniform sampler2D uDithering;
  uniform vec2 ditherScale;
  uniform vec2 texelSize;

  vec3 linearToGamma (vec3 color) {
      color = max(color, vec3(0));
      return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
  }

  void main () {
    vec3 c = texture2D(uTexture, vUv).rgb;

    #ifdef SHADING
      vec3 lc = texture2D(uTexture, vL).rgb;
      vec3 rc = texture2D(uTexture, vR).rgb;
      vec3 tc = texture2D(uTexture, vT).rgb;
      vec3 bc = texture2D(uTexture, vB).rgb;

      float dx = length(rc) - length(lc);
      float dy = length(tc) - length(bc);

      vec3 n = normalize(vec3(dx, dy, length(texelSize)));
      vec3 l = vec3(0.0, 0.0, 1.0);

      float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
      c *= diffuse;
    #endif

    #ifdef BLOOM
      vec3 bloom = texture2D(uBloom, vUv).rgb;
    #endif

    #ifdef SUNRAYS
      float sunrays = texture2D(uSunrays, vUv).r;
      c *= sunrays;
      #ifdef BLOOM
        bloom *= sunrays;
      #endif
    #endif

    #ifdef BLOOM
      float noise = texture2D(uDithering, vUv * ditherScale).r;
      noise = noise * 2.0 - 1.0;
      bloom += noise / 255.0;
      bloom = linearToGamma(bloom);
      c += bloom;
    #endif

    float a = max(c.r, max(c.g, c.b));
    gl_FragColor = vec4(c, a);
  }
`}`;

export default class DisplayProgram extends Program<typeof vertexShader, typeof displayShaderSource> {
  programs: WebGLProgram[] = [];
  activeProgram!: WebGLProgram;

  constructor(gl: WebGLContext) {
    super(gl, vertexShader, displayShaderSource);
  }

  setKeywords(keywords: string[]) {
    let hash = 0;
    for (let i = 0; i < keywords.length; i++)
      hash += hashCode(keywords[i]);

    let program = this.programs[hash];
    if (program == null) {
      let fragmentShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, displayShaderSource, keywords);
      program = createProgram(this.gl, this.vertexShader, fragmentShader);
      this.programs[hash] = program;
    }

    if (program == this.activeProgram)
      return;

    this.activeProgram = program;
  }

  bind() {
    this.gl.useProgram(this.activeProgram);
  }

  run(target: DrawTarget, dye: FBO, bloom: FBO, ditheringTexture: Texture, sunrays: FBO, config: { SHADING: boolean, BLOOM: boolean, SUNRAYS: boolean }, quad: Quad) {
    let width = target.width;
    let height = target.height;

    this.bind();
    if (config.SHADING)
      this.uniforms.texelSize = [1.0 / width, 1.0 / height];
    this.uniforms.uTexture = dye.attach(0);
    if (config.BLOOM) {
      this.uniforms.uBloom = bloom.attach(1);
      this.uniforms.uDithering = ditheringTexture.attach(2);
      let scale = ditheringTexture.getTextureScale(width, height);
      this.uniforms.ditherScale = [scale.x, scale.y];
    }
    if (config.SUNRAYS)
      this.uniforms.uSunrays = sunrays.attach(3);

    target.drawTo(quad);
  }
}
