/**
 * Knurled rings for the lens and mount: a disc of radius 1 and height 1
 * whose rim is cut into straight ridges, scaled into place like the kit's
 * unit cylinder. One mesh per ring, so a lens with three grips costs three
 * draws instead of a hundred ridge boxes.
 */
import { ExtrudeGeometry, Shape } from "three";
import { cachedGeometry } from "../../geometries";
import { welded } from "../shared/welded";

/**
 * `teeth` ridges around the rim, each groove `depth` deep as a fraction of
 * the radius. Ridges and grooves both have flat faces joined by short
 * slopes, which is how machined knurling catches the light.
 */
export function knurlGeometry(teeth: number, depth: number) {
  return cachedGeometry(`camera:knurl:${teeth}:${depth}`, () => {
    const step = (Math.PI * 2) / teeth;
    const inner = 1 - depth;
    const outline = new Shape();
    const point = (angle: number, radius: number) => [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
    outline.moveTo(...point(0, 1));
    for (let i = 0; i < teeth; i += 1) {
      const a = i * step;
      outline.lineTo(...point(a + step * 0.4, 1));
      outline.lineTo(...point(a + step * 0.5, inner));
      outline.lineTo(...point(a + step * 0.9, inner));
      outline.lineTo(...point(a + step, 1));
    }
    const geometry = new ExtrudeGeometry(outline, { depth: 1, bevelEnabled: false });
    // Stand it up along Y and centre it, like the unit cylinder.
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -0.5, 0);
    return welded(geometry);
  });
}
