import { baseVertexShader } from "../index.js";
import { compileShader, Program } from "../Material.js";
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
export default class CurlProgram extends Program {
    constructor(gl) {
        super(gl, baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, curlFragmentShader));
    }
    run(velocity, target, quad) {
        this.bind();
        this.uniforms.texelSize = [velocity.texelSizeX, velocity.texelSizeY];
        this.uniforms.uVelocity = velocity.read.attach(0);
        target.drawTo(quad);
    }
}
