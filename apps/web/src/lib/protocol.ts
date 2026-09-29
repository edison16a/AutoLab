/**
 * The gateway's binary envelope: a 4 byte big endian header length, a UTF-8
 * JSON header, then the raw JPEG. Keeping header and image in one WebSocket
 * message means they can never arrive out of step, and there's no base64
 * overhead. See docs/protocol.md for the full message list.
 */

/** Headers are small JSON objects. Anything bigger is treated as garbage. */
const MAX_HEADER_BYTES = 8192;

export interface Envelope {
  header: Record<string, unknown> & { type?: string };
  jpeg: Blob;
}

/** Splits a binary message into its header and JPEG. Returns null for malformed data. */
export function unpackEnvelope(data: ArrayBuffer): Envelope | null {
  if (data.byteLength < 5) return null;
  const length = new DataView(data).getUint32(0);
  if (length > MAX_HEADER_BYTES || length + 4 >= data.byteLength) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(data.slice(4, length + 4)));
    return { header, jpeg: new Blob([data.slice(length + 4)], { type: "image/jpeg" }) };
  } catch {
    return null;
  }
}

/** Builds a binary message, used to send a saved image to the cloud ML worker. */
export function packEnvelope(header: Record<string, unknown>, jpeg: ArrayBuffer) {
  const head = new TextEncoder().encode(JSON.stringify(header));
  const packet = new Uint8Array(4 + head.length + jpeg.byteLength);
  new DataView(packet.buffer).setUint32(0, head.length);
  packet.set(head, 4);
  packet.set(new Uint8Array(jpeg), 4 + head.length);
  return packet;
}
