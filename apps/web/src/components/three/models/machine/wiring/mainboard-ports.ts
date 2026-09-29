/**
 * Where the motor cables plug into the mainboard, from its registry place
 * (printer_controller in hardware-parts-electronics.ts) and the socket
 * layout in PrinterControllerModel. The sockets sit along the board's
 * front edge and open toward the door, so every plug comes in from +Z.
 */
import { mm } from "../../details/units";
import { CHAMBER_FLOOR } from "../layout";

const BOARD = { x: 0.45, z: -1.28 } as const;

/** Socket centres along X, left to right: X, Y and Z drivers. */
export const SOCKET_X = { x: BOARD.x + mm(-26), y: BOARD.x + mm(-8), z: BOARD.x + mm(10) } as const;
/** Centre height of a plug in its socket, and where the wires leave the back of the plug. */
export const PLUG_Y = 0.558;
export const PLUG_BACK = BOARD.z + mm(33) + mm(3);
/** A bundle lying on the chamber floor. */
export const FLOOR_Y = CHAMBER_FLOOR + 0.024;
