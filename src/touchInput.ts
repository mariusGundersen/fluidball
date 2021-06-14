
import { Pointer } from './Pointer';
import { Color } from './types';
import { scaleByPixelRatio } from "./utils";

const SPLAT_FORCE = 6000;

export default function touchInput(canvas: HTMLCanvasElement) {

  const pointers = new Map<number, Pointer>();

  canvas.addEventListener('pointerdown', e => {
    let posX = scaleByPixelRatio(e.offsetX);
    let posY = scaleByPixelRatio(e.offsetY);

    pointers.set(e.pointerId, new Pointer(posX, posY));

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, { capture: false, });

  canvas.addEventListener('pointermove', e => {
    const pointer = pointers.get(e.pointerId);

    if (!pointer)
      return;

    let posX = scaleByPixelRatio(e.offsetX);
    let posY = scaleByPixelRatio(e.offsetY);

    pointer.updatePos(posX, posY);

    e.stopPropagation();
    e.preventDefault();
  }, { capture: false, });

  canvas.addEventListener('lostpointercapture', e => {
    pointers.delete(e.pointerId);
  });

  return () => {
    const splats: Splat[] = [];
    pointers.forEach(p => {
      if (p.moved) {
        p.moved = false;
        splats.push(splatPointer(p));
      }
    });

    return splats;
  }

}

export interface Splat {
  readonly dx: number,
  readonly dy: number,
  readonly x: number,
  readonly y: number,
  readonly color: Color
}

function splatPointer(pointer: Pointer) {
  let dx = pointer.deltaX * SPLAT_FORCE;
  let dy = pointer.deltaY * SPLAT_FORCE;
  return {
    dx,
    dy,
    x: pointer.texcoordX,
    y: pointer.texcoordY,
    color: pointer.color
  }
}