/*
MIT License

Copyright (c) 2017 Pavel Dobryakov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import createDoubleFBO, { DoubleFBO } from "./createDoubleFBO.js";
import createFBO, { DrawTarget, FBO } from "./createFBO.js";
import createTextureAsync from "./createTextureAsync.js";
import Stats from "./fps.js";
import getWebGLContext from "./getWebGLContext.js";
import Material, { compileShader, Program } from "./Material.js";
import BloomProgram from "./programs/bloom.js";
import BlurProgram from "./programs/blur.js";
import CurlProgram from "./programs/curl.js";
import SunraysProgram from "./programs/sunrays.js";
import Quad from "./Quad.js";
import startGUI, { isMobile } from "./startGUI.js";
import { clamp, correctDeltaX, correctDeltaY, generateColor, getResolution, normalizeColor, scaleByPixelRatio, wrap } from "./utils.js";

// Simulation section

const canvas = document.getElementsByTagName('canvas')[0];
resizeCanvas();

let config = {
  SIM_RESOLUTION: 128,
  DYE_RESOLUTION: 1024,
  CAPTURE_RESOLUTION: 512,
  DENSITY_DISSIPATION: 0.3,
  VELOCITY_DISSIPATION: 0.3,
  PRESSURE: 0.8,
  PRESSURE_ITERATIONS: 20,
  CURL: 10,
  SPLAT_RADIUS: 0.25,
  SPLAT_FORCE: 6000,
  SHADING: true,
  COLORFUL: true,
  COLOR_UPDATE_SPEED: 10,
  PAUSED: false,
  BACK_COLOR: { r: 0, g: 0, b: 0 },
  TRANSPARENT: false,
  BLOOM: true,
  BLOOM_ITERATIONS: 8,
  BLOOM_RESOLUTION: 256,
  BLOOM_INTENSITY: 0.8,
  BLOOM_THRESHOLD: 0.6,
  BLOOM_SOFT_KNEE: 0.7,
  SUNRAYS: true,
  SUNRAYS_RESOLUTION: 196,
  SUNRAYS_WEIGHT: 1.0,
}

class Pointer {
  texcoordX: number;
  texcoordY: number;
  prevTexcoordX: number;
  prevTexcoordY: number;
  deltaX = 0;
  deltaY = 0;
  moved = false;
  color = generateColor();
  constructor(posX: number, posY: number) {
    this.texcoordX = posX / canvas.width;
    this.texcoordY = 1.0 - posY / canvas.height;
    this.prevTexcoordX = this.texcoordX;
    this.prevTexcoordY = this.texcoordY;
  }

  updatePos(posX: number, posY: number) {
    this.prevTexcoordX = this.texcoordX;
    this.prevTexcoordY = this.texcoordY;
    this.texcoordX = posX / canvas.width;
    this.texcoordY = 1.0 - posY / canvas.height;
    this.deltaX = correctDeltaX(canvas, this.texcoordX - this.prevTexcoordX);
    this.deltaY = correctDeltaY(canvas, this.texcoordY - this.prevTexcoordY);
    this.moved = Math.abs(this.deltaX) > 0 || Math.abs(this.deltaY) > 0;
  }
}

const pointers = new Map<number, Pointer>();
const splatStack: number[] = [];

const { gl, ext } = getWebGLContext(canvas);

if (isMobile()) {
  config.DYE_RESOLUTION = 512;
}

if (!ext.supportLinearFiltering) {
  config.DYE_RESOLUTION = 512;
  config.SHADING = false;
  config.BLOOM = false;
  config.SUNRAYS = false;
}

startGUI(config, {
  initFramebuffers,
  updateKeywords,
  splatStack,
  captureScreenshot: () => { }
});




export const baseVertexShader = compileShader(gl, gl.VERTEX_SHADER, `
    precision highp float;

    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`);


const copyShader = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        gl_FragColor = texture2D(uTexture, vUv);
    }
`);

const clearShader = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;

    void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
    }
`);

const colorShader = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;

    uniform vec4 color;

    void main () {
        gl_FragColor = color;
    }
`);

const checkerboardShader = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float aspectRatio;

    #define SCALE 25.0

    void main () {
        vec2 uv = floor(vUv * SCALE * vec2(aspectRatio, 1.0));
        float v = mod(uv.x + uv.y, 2.0);
        v = v * 0.1 + 0.8;
        gl_FragColor = vec4(vec3(v), 1.0);
    }
`);

const displayShaderSource = `
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
`;

const splatShader = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;

    void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
    }
`);

const advectionShader = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;

    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5;

        vec2 iuv = floor(st);
        vec2 fuv = fract(st);

        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }

    void main () {
    #ifdef MANUAL_FILTERING
        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
        vec4 result = bilerp(uSource, coord, dyeTexelSize);
    #else
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
    #endif
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
    }`,
  ext.supportLinearFiltering ? undefined : ['MANUAL_FILTERING']
);

const divergenceShader = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;

        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }

        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
`);

const vorticityShader = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;

    void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;

        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;

        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity += force * dt;
        velocity = clamp(velocity, -1000.0, 1000.0);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`);

const pressureShader = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
`);

const gradientSubtractShader = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`);

const blit = (() => {
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  return (target: FBO | null, clear = false) => {
    if (target == null) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    if (clear) {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    // CHECK_FRAMEBUFFER_STATUS();
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }
})();

function CHECK_FRAMEBUFFER_STATUS() {
  let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status != gl.FRAMEBUFFER_COMPLETE)
    console.trace("Framebuffer error: " + status);
}

let dye: DoubleFBO;
let velocity: DoubleFBO;
let divergence: FBO;
let curl: FBO;
let pressure: DoubleFBO;
let bloom: FBO;
let bloomFramebuffers: FBO[] = [];
let sunrays: FBO;
let sunraysTemp: FBO;

let ditheringTexture = createTextureAsync(gl, 'LDR_LLL1_0.png');

const blurProgram = new BlurProgram(gl);
const copyProgram = new Program(gl, baseVertexShader, copyShader);
const clearProgram = new Program(gl, baseVertexShader, clearShader);
const colorProgram = new Program(gl, baseVertexShader, colorShader);
const checkerboardProgram = new Program(gl, baseVertexShader, checkerboardShader);
const bloomProgram = new BloomProgram(gl);
const sunraysProgram = new SunraysProgram(gl);
const splatProgram = new Program(gl, baseVertexShader, splatShader);
const advectionProgram = new Program(gl, baseVertexShader, advectionShader);
const divergenceProgram = new Program(gl, baseVertexShader, divergenceShader);
const curlProgram = new CurlProgram(gl);
const vorticityProgram = new Program(gl, baseVertexShader, vorticityShader);
const pressureProgram = new Program(gl, baseVertexShader, pressureShader);
const gradienSubtractProgram = new Program(gl, baseVertexShader, gradientSubtractShader);

const displayMaterial = new Material(gl, baseVertexShader, displayShaderSource);
const quad = new Quad(gl);

function initFramebuffers() {
  let simRes = getResolution(gl, config.SIM_RESOLUTION);
  let dyeRes = getResolution(gl, config.DYE_RESOLUTION);

  const texType = ext.halfFloatTexType;
  const rgba = ext.formatRGBA;
  const rg = ext.formatRG;
  const r = ext.formatR;
  const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

  gl.disable(gl.BLEND);

  if (dye == null)
    dye = createDoubleFBO(gl, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
  else
    dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);

  if (velocity == null)
    velocity = createDoubleFBO(gl, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
  else
    velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);

  divergence = createFBO(gl, simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
  curl = createFBO(gl, simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
  pressure = createDoubleFBO(gl, simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);

  initBloomFramebuffers();
  initSunraysFramebuffers();
}

function initBloomFramebuffers() {
  let res = getResolution(gl, config.BLOOM_RESOLUTION);

  const texType = ext.halfFloatTexType;
  const rgba = ext.formatRGBA;
  const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

  bloom = createFBO(gl, res.width, res.height, rgba.internalFormat, rgba.format, texType, filtering);

  bloomFramebuffers.length = 0;
  for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
    let width = res.width >> (i + 1);
    let height = res.height >> (i + 1);

    if (width < 2 || height < 2) break;

    let fbo = createFBO(gl, width, height, rgba.internalFormat, rgba.format, texType, filtering);
    bloomFramebuffers.push(fbo);
  }
}

function initSunraysFramebuffers() {
  let res = getResolution(gl, config.SUNRAYS_RESOLUTION);

  const texType = ext.halfFloatTexType;
  const r = ext.formatR;
  const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

  sunrays = createFBO(gl, res.width, res.height, r.internalFormat, r.format, texType, filtering);
  sunraysTemp = createFBO(gl, res.width, res.height, r.internalFormat, r.format, texType, filtering);
}

function resizeFBO(target: FBO, w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
  let newFBO = createFBO(gl, w, h, internalFormat, format, type, param);
  copyProgram.bind();
  copyProgram.uniforms.uTexture = target.attach(0);
  blit(newFBO);
  gl.deleteTexture(target.texture);
  return newFBO;
}

function resizeDoubleFBO(target: DoubleFBO, w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
  if (target.width == w && target.height == h)
    return target;
  target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
  target.write = createFBO(gl, w, h, internalFormat, format, type, param);
  target.width = w;
  target.height = h;
  target.texelSizeX = 1.0 / w;
  target.texelSizeY = 1.0 / h;
  return target;
}

function updateKeywords() {
  let displayKeywords = [];
  if (config.SHADING) displayKeywords.push("SHADING");
  if (config.BLOOM) displayKeywords.push("BLOOM");
  if (config.SUNRAYS) displayKeywords.push("SUNRAYS");
  displayMaterial.setKeywords(displayKeywords);
}

updateKeywords();
initFramebuffers();
multipleSplats((Math.random() * 20) + 5);

const ball = {
  x: 0.5,
  y: 0.5,
  elm: document.querySelector('.ball') as HTMLDivElement
};

const screen: DrawTarget = {
  get width() {
    return gl.drawingBufferWidth;
  },
  get height() {
    return gl.drawingBufferHeight;
  },
  drawTo(quad: Quad) {
    gl.viewport(0, 0, this.width, this.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    quad.draw();
  }
}

let lastUpdateTime = window.performance.now();
let colorUpdateTimer = 0.0;

var stats = Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

requestAnimationFrame(update);

function update(now: number) {
  stats.begin()
  const dt = (now - lastUpdateTime) / 1000;
  lastUpdateTime = now;
  updateBall(dt)
  if (resizeCanvas())
    initFramebuffers();
  updateColors(dt);
  applyInputs();
  if (!config.PAUSED)
    step(dt);
  render(screen);
  stats.end();
  requestAnimationFrame(update);
}

function updateBall(dt: number) {
  const SIZE = 4;
  gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.read.fbo);
  var velocityPixels = new Float32Array(SIZE * SIZE * 4);
  gl.readPixels(velocity.width * ball.x - SIZE / 2, velocity.height * ball.y - SIZE / 2, SIZE, SIZE, gl.RGBA, gl.FLOAT, velocityPixels);

  let vx = 0, vy = 0;
  for (let i = 0; i < velocityPixels.length; i += 4) {
    vx += velocityPixels[i];
    vy += velocityPixels[i + 1];
  }

  vx /= SIZE * SIZE;
  vy /= SIZE * SIZE;

  ball.x += vx / velocity.width * dt;
  ball.y += vy / velocity.height * dt;
  ball.x = clamp(ball.x, 0.01, 0.99);
  ball.y = clamp(ball.y, 0.01, 0.99);
  ball.elm.style.transform = `translate(${ball.x * 100}vw, ${100 - ball.y * 100}vh)`;
}

function resizeCanvas() {
  let width = scaleByPixelRatio(canvas.clientWidth);
  let height = scaleByPixelRatio(canvas.clientHeight);
  if (canvas.width != width || canvas.height != height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
}

function updateColors(dt: number) {
  if (!config.COLORFUL) return;

  colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
  if (colorUpdateTimer >= 1) {
    colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
    pointers.forEach(p => {
      p.color = generateColor();
    });
  }
}

function applyInputs() {
  if (splatStack.length > 0)
    multipleSplats(splatStack.pop() as number);

  pointers.forEach(p => {
    if (p.moved) {
      p.moved = false;
      splatPointer(p);
    }
  });
}

function step(dt: number) {
  gl.disable(gl.BLEND);

  curlProgram.run(velocity, curl, quad);
  quad.blit(curl);

  vorticityProgram.bind();
  vorticityProgram.uniforms.texelSize = [velocity.texelSizeX, velocity.texelSizeY];
  vorticityProgram.uniforms.uVelocity = velocity.read.attach(0);
  vorticityProgram.uniforms.uCurl = curl.attach(1);
  vorticityProgram.uniforms.curl = config.CURL;
  vorticityProgram.uniforms.dt = dt;
  blit(velocity.write);
  velocity.swap();

  divergenceProgram.bind();
  divergenceProgram.uniforms.texelSize = [velocity.texelSizeX, velocity.texelSizeY];
  divergenceProgram.uniforms.uVelocity = velocity.read.attach(0);
  blit(divergence);

  clearProgram.bind();
  clearProgram.uniforms.uTexture = pressure.read.attach(0);
  clearProgram.uniforms.value = config.PRESSURE;
  blit(pressure.write);
  pressure.swap();

  pressureProgram.bind();
  pressureProgram.uniforms.texelSize = [velocity.texelSizeX, velocity.texelSizeY];
  pressureProgram.uniforms.uDivergence = divergence.attach(0);
  for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
    pressureProgram.uniforms.uPressure = pressure.read.attach(1);
    blit(pressure.write);
    pressure.swap();
  }

  gradienSubtractProgram.bind();
  gradienSubtractProgram.uniforms.texelSize = [velocity.texelSizeX, velocity.texelSizeY];
  gradienSubtractProgram.uniforms.uPressure = pressure.read.attach(0);
  gradienSubtractProgram.uniforms.uVelocity = velocity.read.attach(1);
  blit(velocity.write);
  velocity.swap();

  advectionProgram.bind();
  advectionProgram.uniforms.texelSize = [velocity.texelSizeX, velocity.texelSizeY];
  if (!ext.supportLinearFiltering)
    advectionProgram.uniforms.dyeTexelSize = [velocity.texelSizeX, velocity.texelSizeY];
  advectionProgram.uniforms.uVelocity = advectionProgram.uniforms.uSource = velocity.read.attach(0);
  advectionProgram.uniforms.dt = dt;
  advectionProgram.uniforms.dissipation = config.VELOCITY_DISSIPATION;
  blit(velocity.write);
  velocity.swap();

  if (!ext.supportLinearFiltering)
    advectionProgram.uniforms.dyeTexelSize = [dye.texelSizeX, dye.texelSizeY];
  advectionProgram.uniforms.uVelocity = velocity.read.attach(0);
  advectionProgram.uniforms.uSource = dye.read.attach(1);
  advectionProgram.uniforms.dissipation = config.DENSITY_DISSIPATION;
  blit(dye.write);
  dye.swap();
}

function render(target: DrawTarget) {
  if (config.BLOOM)
    bloomProgram.run(dye.read, bloomFramebuffers, bloom, config, quad);
  if (config.SUNRAYS) {
    sunraysProgram.run(dye.read, dye.write, config.SUNRAYS_WEIGHT, sunrays, quad);
    blurProgram.run(sunrays, sunraysTemp, 1, quad);
  }

  if (target == null || !config.TRANSPARENT) {
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
  }
  else {
    gl.disable(gl.BLEND);
  }

  if (!config.TRANSPARENT)
    drawColor(target, normalizeColor(config.BACK_COLOR));
  if (target == null && config.TRANSPARENT)
    drawCheckerboard(target);
  drawDisplay(target);
}

function drawColor(target: DrawTarget, color: { r: any; g: any; b: any; }) {
  colorProgram.bind();
  colorProgram.uniforms.color = [color.r, color.g, color.b, 1];
  target.drawTo(quad);
}

function drawCheckerboard(target: DrawTarget) {
  checkerboardProgram.bind();
  checkerboardProgram.uniforms.aspectRatio = canvas.width / canvas.height;
  target.drawTo(quad);
}

function drawDisplay(target: DrawTarget) {
  let width = target == null ? gl.drawingBufferWidth : target.width;
  let height = target == null ? gl.drawingBufferHeight : target.height;

  displayMaterial.bind();
  if (config.SHADING)
    displayMaterial.uniforms.texelSize = [1.0 / width, 1.0 / height];
  displayMaterial.uniforms.uTexture = dye.read.attach(0);
  if (config.BLOOM) {
    displayMaterial.uniforms.uBloom = bloom.attach(1);
    displayMaterial.uniforms.uDithering = ditheringTexture.attach(2);
    let scale = ditheringTexture.getTextureScale(width, height);
    displayMaterial.uniforms.ditherScale = [scale.x, scale.y];
  }
  if (config.SUNRAYS)
    displayMaterial.uniforms.uSunrays = sunrays.attach(3);

  target.drawTo(quad);
}


function splatPointer(pointer: Pointer) {
  let dx = pointer.deltaX * config.SPLAT_FORCE;
  let dy = pointer.deltaY * config.SPLAT_FORCE;
  splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
}

function multipleSplats(amount: number) {
  for (let i = 0; i < amount; i++) {
    const color = generateColor();
    color.r *= 10.0;
    color.g *= 10.0;
    color.b *= 10.0;
    const x = Math.random();
    const y = Math.random();
    const dx = 1000 * (Math.random() - 0.5);
    const dy = 1000 * (Math.random() - 0.5);
    splat(x, y, dx, dy, color);
  }
}

function splat(x: number, y: number, dx: number, dy: number, color: { r: number; g: number; b: number; }) {
  splatProgram.bind();
  splatProgram.uniforms.uTarget = velocity.read.attach(0);
  splatProgram.uniforms.aspectRatio = canvas.width / canvas.height;
  splatProgram.uniforms.point = [x, y];
  splatProgram.uniforms.color = [dx, dy, 0.0];
  splatProgram.uniforms.radius = correctRadius(config.SPLAT_RADIUS / 100.0);
  blit(velocity.write);
  velocity.swap();

  splatProgram.uniforms.uTarget = dye.read.attach(0);
  splatProgram.uniforms.color = [color.r, color.g, color.b];
  blit(dye.write);
  dye.swap();
}

function correctRadius(radius: number) {
  let aspectRatio = canvas.width / canvas.height;
  if (aspectRatio > 1)
    radius *= aspectRatio;
  return radius;
}

canvas.addEventListener('pointerdown', e => {
  let posX = scaleByPixelRatio(e.offsetX);
  let posY = scaleByPixelRatio(e.offsetY);

  pointers.set(e.pointerId, new Pointer(posX, posY));

  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  e.preventDefault();
}, { capture: false, });

canvas.addEventListener('pointermove', e => {
  const pointer = pointers.get(e.pointerId);

  if (!pointer) return;

  let posX = scaleByPixelRatio(e.offsetX);
  let posY = scaleByPixelRatio(e.offsetY);

  pointer.updatePos(posX, posY);

  e.stopPropagation();
  e.preventDefault();
}, { capture: false, });

canvas.addEventListener('lostpointercapture', e => {
  pointers.delete(e.pointerId)
});

window.addEventListener('keydown', e => {
  if (e.code === 'KeyP')
    config.PAUSED = !config.PAUSED;
  if (e.key === ' ')
    splatStack.push((Math.random() * 20) + 5);
});