export default function getWebGLContext(canvas) {
    const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
    const webgl2 = canvas.getContext('webgl2', params);
    if (webgl2) {
        const gl = webgl2;
        gl.getExtension('EXT_color_buffer_float');
        const supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        const halfFloatTexType = gl.HALF_FLOAT;
        const formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
        const formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
        const formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
        return {
            gl,
            ext: {
                formatRGBA,
                formatRG,
                formatR,
                halfFloatTexType,
                supportLinearFiltering
            }
        };
    }
    else {
        const gl = canvas.getContext('webgl', params);
        if (!gl)
            throw new Error('Webgl not supported');
        const halfFloat = gl.getExtension('OES_texture_half_float');
        if (!halfFloat)
            throw new Error("half_float not supported");
        const supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        return {
            gl,
            ext: {
                formatRGBA: { internalFormat: gl.RGBA, format: gl.RGBA },
                formatRG: { internalFormat: gl.RGBA, format: gl.RGBA },
                formatR: { internalFormat: gl.RGBA, format: gl.RGBA },
                halfFloatTexType: halfFloat.HALF_FLOAT_OES,
                supportLinearFiltering
            }
        };
    }
}
function getSupportedFormat(gl, internalFormat, format, type) {
    if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
        switch (internalFormat) {
            case gl.R16F:
                return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
            case gl.RG16F:
                return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
            default:
                throw new Error("format not supported");
        }
    }
    return {
        internalFormat,
        format
    };
}
function supportRenderTextureFormat(gl, internalFormat, format, type) {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    return status == gl.FRAMEBUFFER_COMPLETE;
}
