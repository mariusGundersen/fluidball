import { hashCode } from "./utils.js";
export default class Material {
    constructor(gl, vertexShader, fragmentShaderSource) {
        this.programs = [];
        this.uniforms = {};
        this.gl = gl;
        this.vertexShader = vertexShader;
        this.fragmentShaderSource = fragmentShaderSource;
    }
    setKeywords(keywords) {
        let hash = 0;
        for (let i = 0; i < keywords.length; i++)
            hash += hashCode(keywords[i]);
        let program = this.programs[hash];
        if (program == null) {
            let fragmentShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
            program = createProgram(this.gl, this.vertexShader.shader, fragmentShader.shader);
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
    constructor(gl, vertexShader, fragmentShader) {
        this.gl = gl;
        this.program = createProgram(gl, vertexShader.shader, fragmentShader.shader);
        this.uniforms = getUniforms(gl, this.program);
    }
    bind() {
        this.gl.useProgram(this.program);
    }
}
export function createProgram(gl, vertexShader, fragmentShader) {
    let program = gl.createProgram();
    if (!program)
        throw new Error("Could not make program");
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        console.trace(gl.getProgramInfoLog(program));
    return program;
}
export function getUniforms(gl, program) {
    const uniforms = {};
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
        const { name, type } = gl.getActiveUniform(program, i);
        const location = gl.getUniformLocation(program, name);
        Object.defineProperty(uniforms, name, {
            get() {
                return gl.getUniform(program, location);
            },
            set(v) {
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
export function compileShader(gl, type, source, keywords) {
    const shader = gl.createShader(type);
    if (!shader)
        throw new Error("Could not make shader");
    gl.shaderSource(shader, addKeywords(source, keywords));
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        console.trace(gl.getShaderInfoLog(shader));
    return { shader };
}
;
function addKeywords(source, keywords) {
    if (!keywords)
        return source;
    let keywordsString = '';
    keywords.forEach((keyword) => {
        keywordsString += '#define ' + keyword + '\n';
    });
    return keywordsString + source;
}
