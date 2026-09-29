/**
 * Small boards are drawn from their datasheet dimensions. One scene unit
 * is about 81 mm, so this turns millimetres into scene units.
 */
export const MM = 1 / 81;

export function mm(value: number) {
  return value * MM;
}

/** 0.1 inch, the pitch of every hobby header. */
export const PITCH = mm(2.54);
