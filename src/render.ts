import { ball, bgTexture, bloom, bloomProgram, blurProgram, config, copyProgram, displayProgram, ditheringTexture, dye, quad, sunrays, sunraysProgram, sunraysTemp } from './index';
import { WebGLContext } from './programs/Program';
import { DrawTarget } from './types';

export function render(gl: WebGLContext, target: DrawTarget) {
  if (config.BLOOM)
    bloomProgram.run(dye.read, bloom, config, quad);
  if (config.SUNRAYS) {
    sunraysProgram.run(dye.read, dye.write, config.SUNRAYS_WEIGHT, [ball.x, ball.y], sunrays, quad);
    blurProgram.run(sunrays, sunraysTemp, 1, quad);
  }

  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);

  //drawColor(target, normalizeColor(config.BACK_COLOR));
  copyProgram.run(bgTexture, target, 1, quad);

  displayProgram.run(target, dye.read, bloom, ditheringTexture, sunrays, config, quad);
}
