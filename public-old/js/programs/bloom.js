import { baseVertexShader } from "../index.js";
import { compileShader, Program } from "../Material.js";
const bloomPrefilterShader = `
precision mediump float;
precision mediump sampler2D;

varying vec2 vUv;
uniform sampler2D uTexture;
uniform vec3 curve;
uniform float threshold;

void main () {
    vec3 c = texture2D(uTexture, vUv).rgb;
    float br = max(c.r, max(c.g, c.b));
    float rq = clamp(br - curve.x, 0.0, curve.y);
    rq = curve.z * rq * rq;
    c *= max(rq, br - threshold) / max(br, 0.0001);
    gl_FragColor = vec4(c, 0.0);
}
`;
const bloomBlurShader = `
precision mediump float;
precision mediump sampler2D;

varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uTexture;

void main () {
    vec4 sum = vec4(0.0);
    sum += texture2D(uTexture, vL);
    sum += texture2D(uTexture, vR);
    sum += texture2D(uTexture, vT);
    sum += texture2D(uTexture, vB);
    sum *= 0.25;
    gl_FragColor = sum;
}
`;
const bloomFinalShader = `
precision mediump float;
precision mediump sampler2D;

varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uTexture;
uniform float intensity;

void main () {
    vec4 sum = vec4(0.0);
    sum += texture2D(uTexture, vL);
    sum += texture2D(uTexture, vR);
    sum += texture2D(uTexture, vT);
    sum += texture2D(uTexture, vB);
    sum *= 0.25;
    gl_FragColor = sum * intensity;
}
`;
export default class BloomProgram {
    constructor(gl) {
        this.gl = gl;
        this.bloomPrefilterProgram = new Program(gl, baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, bloomPrefilterShader));
        this.bloomBlurProgram = new Program(gl, baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, bloomBlurShader));
        this.bloomFinalProgram = new Program(gl, baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, bloomFinalShader));
    }
    run(source, bloomFramebuffers, destination, config, quad) {
        if (bloomFramebuffers.length < 2)
            return;
        let last = destination;
        this.gl.disable(this.gl.BLEND);
        this.bloomPrefilterProgram.bind();
        let knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
        let curve0 = config.BLOOM_THRESHOLD - knee;
        let curve1 = knee * 2;
        let curve2 = 0.25 / knee;
        this.bloomPrefilterProgram.uniforms.curve = [curve0, curve1, curve2];
        this.bloomPrefilterProgram.uniforms.threshold = config.BLOOM_THRESHOLD;
        this.bloomPrefilterProgram.uniforms.uTexture = source.attach(0);
        last.drawTo(quad);
        this.bloomBlurProgram.bind();
        for (let i = 0; i < bloomFramebuffers.length; i++) {
            let dest = bloomFramebuffers[i];
            this.bloomBlurProgram.uniforms.texelSize = [last.texelSizeX, last.texelSizeY];
            this.bloomBlurProgram.uniforms.uTexture = last.attach(0);
            dest.drawTo(quad);
            last = dest;
        }
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        this.gl.enable(this.gl.BLEND);
        for (let i = bloomFramebuffers.length - 2; i >= 0; i--) {
            let baseTex = bloomFramebuffers[i];
            this.bloomBlurProgram.uniforms.texelSize = [last.texelSizeX, last.texelSizeY];
            this.bloomBlurProgram.uniforms.uTexture = last.attach(0);
            this.gl.viewport(0, 0, baseTex.width, baseTex.height);
            baseTex.drawTo(quad);
            last = baseTex;
        }
        this.gl.disable(this.gl.BLEND);
        this.bloomFinalProgram.bind();
        this.bloomFinalProgram.uniforms.texelSize = [last.texelSizeX, last.texelSizeY];
        this.bloomFinalProgram.uniforms.uTexture = last.attach(0);
        this.bloomFinalProgram.uniforms.intensity = config.BLOOM_INTENSITY;
        destination.drawTo(quad);
    }
}
