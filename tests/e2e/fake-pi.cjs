// A Pi's Bluetooth setup service, faked as navigator.bluetooth inside the page.
// It follows devices/raspberry-pi/autolab_agent/provisioning: the UUIDs from
// gatt.py, requests in chunks that end with a newline and their checks from
// session.py, and the status JSON each step of setup_flow.py reports, with
// online and wifi_ssid in every state.

/**
 * Runs in the page before the app, so it must not use anything from this
 * file. `pi` is plain data: deviceId, pin, mode (agentId too in lab mode),
 * the Wi-Fi it's on (wifi, or null when offline) and the networks in range,
 * by name and password. What the page sent ends up on window.__fakePi for
 * the test to check.
 */
function installFakePi(pi) {
  const SERVICE_UUID = "f7a10000-76b8-4f58-9b31-879c4e198a10";
  const COMMAND_UUID = "f7a10001-76b8-4f58-9b31-879c4e198a10";
  const STATUS_UUID = "f7a10002-76b8-4f58-9b31-879c4e198a10";
  const MAX_CHUNK = 512;
  const MAX_REQUEST = 2048;
  const MAX_PIN_ATTEMPTS = 5;
  // Long enough that the page's 1.5 s polls see each step.
  const STEP_MS = 2500;
  // NetworkManager takes a while to bring the old Wi-Fi back after a failed join.
  const RESTORE_MS = 5000;

  const log = (window.__fakePi = { chunks: [], requests: [], states: [], refused: null });
  const wifi = { ssid: pi.wifi, online: pi.wifi !== null };
  const session = { buffer: [], attempts: 0, busy: false, completed: false, supabase: null };
  let status = { state: "ready", device_id: pi.deviceId };
  const report = (state, extra = {}) => {
    status = { state, device_id: pi.deviceId, ...extra };
    log.states.push(state);
  };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  // json.dumps with its defaults: ", " and ": " between items, everything past ASCII escaped.
  const pyDumps = (data) =>
    "{" +
    Object.entries(data)
      .map(([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`)
      .join(", ")
      .replace(/[\u0080-\uffff]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")) +
    "}";

  // BlueZ turns the Pi's DBusError into a bare ATT error, so its text never reaches the browser.
  const refuse = (reason) => {
    log.refused = reason;
    return new DOMException("GATT operation failed for unknown reason.", "NotSupportedError");
  };

  /** session.py receive and _parse, with the keep Wi-Fi rules. Returns [ssid, password] once complete. */
  function receive(chunk) {
    if (session.busy || session.completed) throw refuse("Setup already in progress or completed");
    if (session.attempts >= MAX_PIN_ATTEMPTS) throw refuse("Too many wrong PINs. Restart the Autolab to try again.");
    if (chunk.length > MAX_CHUNK) throw refuse("Invalid BLE chunk");
    log.chunks.push(chunk.length);
    session.buffer.push(...chunk);
    if (session.buffer.length > MAX_REQUEST) {
      session.buffer = [];
      throw refuse("Setup request too large");
    }
    if (session.buffer[session.buffer.length - 1] !== 10) return null;
    const raw = new Uint8Array(session.buffer);
    session.buffer = [];
    let data;
    try {
      data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
    } catch {
      throw refuse("Invalid setup request");
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) throw refuse("Expected setup object");
    if (String(data.pin ?? "") !== pi.pin) {
      session.attempts += 1;
      throw refuse("Setup PIN is incorrect");
    }
    const ssid = data.ssid ?? "";
    const password = data.password ?? "";
    log.requests.push({ keys: Object.keys(data), ssid: data.ssid, password: data.password });
    if (typeof ssid !== "string" || typeof password !== "string") throw refuse("Invalid setup request");
    // Both left out or empty keeps the Wi-Fi the Pi is on.
    if (ssid || password) {
      if (!ssid || !password) throw refuse("Enter both the Wi-Fi name and password, or leave both empty to keep the current Wi-Fi");
      const bytes = new TextEncoder().encode(ssid).length;
      if (bytes > 32 || ssid.includes("\0")) throw refuse("SSID must be 1 to 32 UTF-8 bytes");
      if ([...password].length < 8 || [...password].length > 63 || password.includes("\0"))
        throw refuse("WPA password must be 8 to 63 characters");
    }
    // The gateway's address depends on the machine running the test, so only its form is checked.
    if (data.gateway != null && !/^wss?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?\/?$/.test(data.gateway))
      throw refuse("Gateway must be wss:// or ws:// on the local network, with no path");
    const url = data.supabase_url;
    session.supabase = url ? [url.replace(/\/+$/, ""), data.supabase_key] : null;
    session.busy = true;
    return [ssid, password];
  }

  /** setup_flow.py provision: join Wi-Fi unless the Pi keeps its own, then reach the gateway or Supabase. */
  async function provision(ssid, password) {
    try {
      if (!ssid && !wifi.online) {
        report("error", { message: "This Autolab isn't on Wi-Fi yet. Enter a Wi-Fi name and password." });
        return;
      }
      if (ssid && !(wifi.online && ssid === wifi.ssid)) {
        const failed = `Could not join "${ssid}". Check the Wi-Fi name and password, then retry.`;
        report("connecting");
        // wifi.py scans first, and a Pi on Wi-Fi never leaves it for a network it can't see.
        await sleep(STEP_MS);
        if (!Object.hasOwn(pi.networks, ssid) && wifi.ssid !== null) {
          report("error", { message: failed });
          return;
        }
        const previous = wifi.ssid;
        // Joining a new network drops the current one first.
        Object.assign(wifi, { ssid: null, online: false });
        await sleep(STEP_MS);
        if (pi.networks[ssid] !== password) {
          report("error", { message: failed });
          // The old connection comes back, but only after the error is out.
          setTimeout(() => Object.assign(wifi, { ssid: previous, online: previous !== null }), RESTORE_MS);
          return;
        }
        Object.assign(wifi, { ssid, online: true });
      }
      report("wifi_connected");
      await sleep(STEP_MS);
      if (session.supabase) report("gateway_connected", { mode: "lab", agent_id: pi.agentId });
      else report("gateway_connected", { mode: pi.mode, claimed: false });
      session.completed = true;
    } finally {
      session.busy = false;
    }
  }

  const disconnected = () =>
    new DOMException("GATT Server is disconnected. Cannot perform GATT operations. (Re)connect first with `device.gatt.connect`.", "NetworkError");
  const notPermitted = () => new DOMException("GATT operation not permitted.", "NotSupportedError");
  const server = { connected: false };
  const command = {
    uuid: COMMAND_UUID,
    async readValue() {
      throw notPermitted();
    },
    async writeValueWithResponse(value) {
      if (!server.connected) throw disconnected();
      await sleep(10);
      const request = receive(Array.from(new Uint8Array(value.buffer || value, value.byteOffset || 0, value.byteLength)));
      // gatt.py hands a complete request to a task, after the write has returned.
      if (request) setTimeout(() => provision(...request), 0);
    },
  };
  command.writeValue = command.writeValueWithResponse;
  const statusCharacteristic = {
    uuid: STATUS_UUID,
    async readValue() {
      if (!server.connected) throw disconnected();
      await sleep(10);
      // Whether the Pi is online, and on which Wi-Fi, is read fresh for every state.
      const data = { ...status, online: wifi.online, wifi_ssid: wifi.ssid };
      return new DataView(new TextEncoder().encode(pyDumps(data)).buffer);
    },
    async writeValueWithResponse() {
      throw notPermitted();
    },
  };
  const service = {
    uuid: SERVICE_UUID,
    isPrimary: true,
    async getCharacteristic(uuid) {
      if (!server.connected) throw disconnected();
      if (uuid === COMMAND_UUID) return command;
      if (uuid === STATUS_UUID) return statusCharacteristic;
      throw new DOMException(`No Characteristics matching UUID ${uuid} found in Service with UUID ${SERVICE_UUID}.`, "NotFoundError");
    },
  };
  Object.assign(server, {
    async connect() {
      await sleep(100);
      server.connected = true;
      return server;
    },
    disconnect() {
      server.connected = false;
    },
    async getPrimaryService(uuid) {
      if (!server.connected) throw disconnected();
      if (uuid !== SERVICE_UUID) throw new DOMException(`No Services matching UUID ${uuid} found in Device.`, "NotFoundError");
      return service;
    },
  });
  // gatt.py advertises "Autolab-" and the first four characters of the Device ID.
  const device = { id: "fake-pi", name: "Autolab-" + pi.deviceId.slice(0, 4), gatt: server, addEventListener() {}, removeEventListener() {} };
  server.device = device;
  const bluetooth = {
    async getAvailability() {
      return true;
    },
    async requestDevice(options) {
      if (!navigator.userActivation.isActive)
        throw new DOMException("Must be handling a user gesture to show a permission request.", "SecurityError");
      if (!(options?.filters ?? []).some((filter) => (filter.services ?? []).includes(SERVICE_UUID)))
        throw new DOMException("User cancelled the requestDevice() chooser.", "NotFoundError");
      return device;
    },
    addEventListener() {},
    removeEventListener() {},
  };
  Object.defineProperty(navigator, "bluetooth", { value: bluetooth, configurable: true });
}

module.exports = { installFakePi };
