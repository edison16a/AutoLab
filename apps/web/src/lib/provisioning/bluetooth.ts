// Shared with the opt-in BlueZ provisioning service. No Wi-Fi secrets are stored
// in browser persistence, URLs, gateway requests, or analytics.
export const SERVICE_UUID = "f7a10000-76b8-4f58-9b31-879c4e198a10";
const COMMAND_UUID = "f7a10001-76b8-4f58-9b31-879c4e198a10";
const STATUS_UUID = "f7a10002-76b8-4f58-9b31-879c4e198a10";
export type ProvisionStatus = {
  state:
    "ready" | "connecting" | "wifi_connected" | "gateway_connected" | "error";
  message?: string;
  device_id?: string;
  claim_code?: string;
  claimed?: boolean;
  mode?: string;
  /** Lab mode: the Pi's own Supabase login, for the account to link. */
  agent_id?: string;
  /** NetworkManager says the Pi is connected. Older Pis leave this out. */
  online?: boolean;
  /** The Wi-Fi the Pi is on right now, or null when it has none. Older Pis leave this out. */
  wifi_ssid?: string | null;
};
export class AutolabBluetooth {
  device?: BluetoothDevice;
  command?: BluetoothRemoteGATTCharacteristic;
  status?: BluetoothRemoteGATTCharacteristic;
  // Android runs one GATT operation at a time and fails any that starts
  // meanwhile, so reads and requests wait their turn.
  private turn: Promise<unknown> = Promise.resolve();
  private inTurn<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.turn.then(operation);
    this.turn = result.catch(() => undefined);
    return result;
  }
  async connect() {
    if (!navigator.bluetooth || !window.isSecureContext)
      throw new Error(
        "Bluetooth setup requires a supported browser on HTTPS. Use manual setup instead.",
      );
    // requestDevice must execute directly from the user's click.
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
    });
    const server = await this.device.gatt?.connect();
    if (!server) throw new Error("Bluetooth connection failed");
    const service = await server.getPrimaryService(SERVICE_UUID);
    this.command = await service.getCharacteristic(COMMAND_UUID);
    this.status = await service.getCharacteristic(STATUS_UUID);
    return await this.read();
  }
  read(): Promise<ProvisionStatus> {
    return this.inTurn(async () => {
      if (!this.status) throw new Error("Bluetooth is disconnected");
      const value = await this.status.readValue();
      return JSON.parse(new TextDecoder().decode(value));
    });
  }
  /**
   * `extra` tells the Pi where to connect once it's on Wi-Fi: a gateway, or a Supabase project in lab mode.
   * An empty `ssid` and `password` keep the Wi-Fi the Pi is on.
   */
  async provision(ssid: string, password: string, pin: string, extra: Record<string, string> = {}) {
    const command = this.command;
    if (!command || !this.device?.gatt?.connected)
      throw new Error("Reconnect Bluetooth before provisioning");
    const bytes = new TextEncoder().encode(
      JSON.stringify({ ssid, password, pin, ...extra }),
    );
    if (bytes.length > 2048)
      throw new Error("Provisioning request is too long");
    // Conservative ATT chunks work with the default 23-byte MTU. Newline commits.
    const framed = new Uint8Array(bytes.length + 1);
    framed.set(bytes);
    framed[bytes.length] = 10;
    await this.inTurn(async () => {
      for (let i = 0; i < framed.length; i += 20)
        await command.writeValueWithResponse(framed.slice(i, i + 20));
    });
  }
  disconnect() {
    this.device?.gatt?.disconnect();
    this.device = undefined;
    this.command = undefined;
    this.status = undefined;
  }
}
