import { DoubleFBO } from "../createDoubleFBO";
import { FBO } from "../createFBO";
import { baseVertexShader } from "../index";
import { CompiledShader, compileShader, Program, WebGLContext } from "../Material";
import Quad from "../Quad";

const curlFragmentShader = `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
`;

export type ShaderOf<T> = T extends CompiledShader<infer S> ? S : unknown;

export default class CurlProgram extends Program<ShaderOf<typeof baseVertexShader>, typeof curlFragmentShader> {
  constructor(gl: WebGLContext) {
    super(gl, baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, curlFragmentShader));
  }

  run(velocity: DoubleFBO, target: FBO, quad: Quad) {
    this.bind();
    this.uniforms.texelSize = [velocity.texelSizeX, velocity.texelSizeY];
    this.uniforms.uVelocity = velocity.read.attach(0);
    target.drawTo(quad);
  }
}