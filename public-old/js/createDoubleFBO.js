import createFBO from "./createFBO.js";
export default function createDoubleFBO(gl, w, h, internalFormat, format, type, param) {
    let fbo1 = createFBO(gl, w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(gl, w, h, internalFormat, format, type, param);
    return {
        width: w,
        height: h,
        texelSizeX: fbo1.texelSizeX,
        texelSizeY: fbo1.texelSizeY,
        get read() {
            return fbo1;
        },
        set read(value) {
            fbo1 = value;
        },
        get write() {
            return fbo2;
        },
        set write(value) {
            fbo2 = value;
        },
        swap() {
            let temp = fbo1;
            fbo1 = fbo2;
            fbo2 = temp;
        }
    };
}
