/** Hosts where plain ws:// is fine, because the traffic never leaves this machine. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/**
 * Checks a gateway address before the socket is pointed at it, and returns
 * what's wrong in words or null when it's fine. A remote gateway has to use
 * wss:// so frames and sign in tokens never cross the network in the clear.
 * Paths are refused too: the REST helper only keeps the origin, so a path
 * would work for the socket and silently break everything else.
 */
export function gatewayProblem(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return "Enter a full address, like wss://gateway.example.com";
  }
  if (url.protocol !== "wss:" && url.protocol !== "ws:") return "Use a wss:// address";
  if (url.protocol === "ws:" && !LOCAL_HOSTS.has(url.hostname)) return "Use wss:// for a remote gateway";
  if ((url.pathname && url.pathname !== "/") || url.search || url.hash) return "Remove the path after the host";
  return null;
}

/** The form a saved gateway takes: trimmed, with no trailing slash. */
export function cleanGateway(value: string) {
  return value.trim().replace(/\/$/, "");
}
