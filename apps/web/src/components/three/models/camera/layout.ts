/**
 * Shared measurements for the HQ camera model. The camera hangs lens down
 * in its dock, so the optics stack runs along -Y from the underside of the
 * board and the component side faces up.
 *
 * The board is drawn 0.6 units square (the real one is 38 mm, about 0.47)
 * because the dock rails and the registry hit box were sized around it.
 * Everything else keeps the real proportions at that scale.
 */
import type { Vec3 } from "../../types";

export const BOARD = { size: 0.6, thickness: 0.028, holeInset: 0.063 } as const;
export const BOARD_TOP = BOARD.thickness / 2;
export const BOARD_BOTTOM = -BOARD.thickness / 2;

/** Millimetres on the real camera, at the model's scale. */
export const mm = (value: number) => (value * BOARD.size) / 38;

/** Where the lens barrel starts, just below the C-CS adapter ring. */
export const LENS_TOP = -0.14;

/**
 * Where the ribbon enters the connector on the board's +X edge, in the
 * camera's local space. The ribbon leaves toward +X, flat along the board.
 */
export const CAMERA_FPC_ENTRY: Vec3 = [0.25, BOARD_TOP + 0.016, 0];
