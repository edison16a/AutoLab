/** Props every part model accepts. Most parts ignore them. */
export interface PartModelProps {
  /**
   * The part is reporting and working right now. Models with a status LED
   * light it in that LED's real colour; nothing else changes, so a render
   * never suggests a reading that doesn't exist.
   */
  live?: boolean;
}
