import Quad from "../Quad";
import { DrawTarget } from "../types";
import { glsl } from "../utils";
import { Program, WebGLContext } from "./Program";
import { vertexShader } from "./vertexShader";

const colorFragmentShader = glsl`${`
  precision mediump float;

  varying vec2 vUv;

  uniform vec2 size;
  uniform vec2 center;
  uniform float radius;
  uniform vec4 color;

  float shadow = 1.0;

  void main() {
    float dx = (center.x - vUv.x)*size.x;
    float dy = (center.y - vUv.y)*size.y;
    float distance = sqrt(dx*dx + dy*dy);

    if ( distance < radius )
      gl_FragColor = color;
    else if(distance < radius + radius*shadow) {
      gl_FragColor = vec4(1.0 - (distance-radius)/radius/shadow);
    } else
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
  }
`}`;


/*
1.2 => 0.2 => 1 => 0
1 => 0 => => 0 => 1
*/

export default class BallProgram extends Program<typeof vertexShader, typeof colorFragmentShader> {
  constructor(gl: WebGLContext) {
    super(gl, vertexShader, colorFragmentShader);
  }

  run(target: DrawTarget, center: [number, number], radius: number, color: { r: number; g: number; b: number; }, quad: Quad) {
    this.bind();
    this.uniforms.size = [target.width, target.height];
    this.uniforms.center = center;
    this.uniforms.radius = radius * target.height;
    this.uniforms.color = [color.r, color.g, color.b, 1];
    target.drawTo(quad);
  }
}