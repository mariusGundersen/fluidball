import { compileShader, Program } from "../Material.js";
const blurVertexShader = `
precision highp float;

attribute vec2 aPosition;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
uniform vec2 texelSize;

void main () {
    vUv = aPosition * 0.5 + 0.5;
    float offset = 1.33333333;
    vL = vUv - texelSize * offset;
    vR = vUv + texelSize * offset;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;
const blurShader = `
precision mediump float;
precision mediump sampler2D;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
uniform sampler2D uTexture;

void main () {
    vec4 sum = texture2D(uTexture, vUv) * 0.29411764;
    sum += texture2D(uTexture, vL) * 0.35294117;
    sum += texture2D(uTexture, vR) * 0.35294117;
    gl_FragColor = sum;
}
`;
export default class BlurProgram extends Program {
    constructor(gl) {
        super(gl, compileShader(gl, gl.VERTEX_SHADER, blurVertexShader), compileShader(gl, gl.FRAGMENT_SHADER, blurShader));
    }
    run(target, temp, iterations, quad) {
        this.bind();
        for (let i = 0; i < iterations; i++) {
            this.uniforms.texelSize = [target.texelSizeX, 0];
            this.uniforms.uTexture = target.attach(0);
            temp.drawTo(quad);
            this.uniforms.texelSize = [0.0, target.texelSizeY];
            this.uniforms.uTexture = temp.attach(0);
            target.drawTo(quad);
        }
    }
}
