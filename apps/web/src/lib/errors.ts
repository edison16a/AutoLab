/** Turns anything thrown into text a person can read in a toast. */
export function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
