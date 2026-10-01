import { httpBase } from "../cloud";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * The gateway address to hand the Pi during Bluetooth setup. "localhost"
 * means this computer to the browser but the Pi itself to the Pi, so in that
 * case ask the local gateway which network address the Pi can reach it on.
 */
export async function piGateway(gateway: string) {
  if (!LOOPBACK.has(new URL(gateway).hostname)) return gateway;
  let urls: string[] = [];
  try {
    const response = await fetch(`${httpBase(gateway)}/lan`);
    if (response.ok) urls = ((await response.json()) as { urls?: string[] }).urls ?? [];
  } catch {
    throw new Error("Start the gateway on this computer, then try again.");
  }
  if (!urls[0]) throw new Error("This computer isn't on a network the Pi can join. Connect it to the lab Wi-Fi or Ethernet.");
  return urls[0];
}
