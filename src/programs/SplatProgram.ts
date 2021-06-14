import { DoubleFBO } from "../createDoubleFBO";
import Quad from "../Quad";
import { glsl } from "../utils";
import { Program, WebGLContext } from "./Program";
import { vertexShader } from "./vertexShader";

const splatShader = glsl`${`
  precision highp float;
  precision highp sampler2D;

  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;
  uniform float sourceMult;

  void main () {
    vec2 p = vUv - point.xy;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    vec3 base = texture2D(uTarget, vUv).rgb;
    gl_FragColor = vec4(sourceMult*base + splat, 1.0);
  }
`}`;

export default class PressureProgram extends Program<typeof vertexShader, typeof splatShader> {
  constructor(gl: WebGLContext) {
    super(gl, vertexShader, splatShader);
  }

  splat(velocity: DoubleFBO, pos: [number, number], color: [number, number, number], radius: number, aspectRatio: number, quad: Quad) {
    this.bind();
    this.uniforms.aspectRatio = aspectRatio;
    this.uniforms.radius = correctRadius(radius, aspectRatio);
    this.uniforms.point = pos;
    this.uniforms.sourceMult = 1;

    this.uniforms.uTarget = velocity.read.attach(0);
    this.uniforms.color = color;

    velocity.write.drawTo(quad);
    velocity.swap();
  }
}

function correctRadius(radius: number, aspectRatio: number) {
  if (aspectRatio > 1)
    radius *= aspectRatio;
  return radius;
}
