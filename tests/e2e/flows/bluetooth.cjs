// Bluetooth setup with a fake Pi that's already online on a phone hotspot.
// Keeping that Wi-Fi is the default. A different network sends its name and
// password. A name the Pi can't see never moves it, and after a failed join
// the Pi gets back on the hotspot a few seconds later, so keeping it still
// works and setup ends on a real heartbeat.
const { BASE, assert, assertShowButton } = require("../support.cjs");
const { installFakePi } = require("../fake-pi.cjs");

const PI = {
  deviceId: process.env.TEST_DEVICE_ID,
  pin: "482915",
  mode: "demo",
  wifi: "Edison",
  networks: { Edison: "hotspot-pass", "Lab WiFi": "labwifi-2026" },
};

const lastRequest = (page) => page.evaluate(() => window.__fakePi.requests.at(-1));

module.exports = async function bluetooth(browser, newPage, errors) {
  const page = await newPage(browser, errors);
  await page.addInitScript(() => {
    localStorage.setItem("autolab:session", JSON.stringify({ id: "demo-ntabuser", email: "ntabuser", name: "ntabuser" }));
  });
  await page.addInitScript(installFakePi, PI);
  await page.goto(BASE);
  await page.getByRole("banner").getByRole("button", { name: "Connect device", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Connect device" });
  await dialog.getByRole("button", { name: "Camera connected", exact: true }).click();
  await dialog.getByRole("button", { name: "Raspberry Pi is powered on", exact: true }).click();
  await dialog.getByRole("button", { name: "Find Autolab", exact: true }).click();

  const onHotspot = dialog.getByText("This Autolab is already on Edison.", { exact: true });
  await onHotspot.waitFor();
  await dialog.getByRole("heading", { name: "Connect your Autolab", exact: true }).waitFor();
  const keep = dialog.getByRole("switch", { name: "Keep this Wi-Fi", exact: true });
  assert.equal(await keep.getAttribute("aria-checked"), "true", "Keeping the Pi's Wi-Fi is the default");
  const ssid = dialog.getByLabel("Wi-Fi name", { exact: true });
  const password = dialog.getByLabel("Wi-Fi password", { exact: true });
  assert.equal(await ssid.count(), 0, "No Wi-Fi name while keeping");
  assert.equal(await password.count(), 0, "No Wi-Fi password while keeping");
  const pin = dialog.getByLabel("Setup PIN shown on the Pi", { exact: true });
  await pin.fill(PI.pin);
  await assertShowButton(dialog, pin, "PIN");

  await keep.click();
  await dialog.getByRole("heading", { name: "Join Wi-Fi", exact: true }).waitFor();
  assert.equal(await ssid.getAttribute("autocapitalize"), "none", "Phones leave the Wi-Fi name as typed");
  // Names are case sensitive, so this one isn't in range.
  await ssid.fill("lab wifi");
  await password.fill("labwifi-2026");
  await dialog.getByRole("button", { name: "Connect Wi-Fi", exact: true }).click();
  await dialog.getByRole("alert").filter({ hasText: 'Could not join "lab wifi".' }).waitFor({ timeout: 30000 });
  assert.equal(await onHotspot.count(), 1, "A network the Pi can't see never moves it off the hotspot");

  await ssid.fill("Lab WiFi");
  await password.fill("wrong-password");
  await pin.fill(PI.pin);
  await assertShowButton(dialog, password, "password");
  await dialog.getByRole("button", { name: "Show password", exact: true }).click();
  await dialog.getByRole("button", { name: "Connect Wi-Fi", exact: true }).click();
  assert.equal(await password.getAttribute("type"), "password", "Submitting hides the password again");
  // Locked while it runs, eye buttons included.
  await dialog.locator("button[aria-label='Show PIN']:disabled").waitFor();
  await dialog.getByRole("alert").filter({ hasText: 'Could not join "Lab WiFi".' }).waitFor({ timeout: 30000 });
  const different = await lastRequest(page);
  assert.equal(different.ssid, "Lab WiFi");
  assert.equal(different.password, "wrong-password");

  // The Pi is still finding its way back to the hotspot, then it's on offer again.
  assert.equal(await onHotspot.count(), 0, "No Keep this Wi-Fi while the Pi is offline");
  await onHotspot.waitFor({ timeout: 15000 });
  await keep.click();
  assert.equal(await password.count(), 0, "Keeping hides the Wi-Fi fields again");
  await pin.fill(PI.pin);
  await dialog.getByRole("button", { name: "Connect device", exact: true }).click();
  await dialog.getByText("On Wi-Fi, reaching the gateway", { exact: true }).waitFor({ timeout: 30000 });
  const kept = await lastRequest(page);
  assert.equal(kept.ssid, "", "Keeping sends an empty Wi-Fi name");
  assert.equal(kept.password, "", "Keeping sends an empty Wi-Fi password");
  // Ready only comes from the simulated Pi's heartbeat, as in the manual flow.
  await dialog.getByRole("button", { name: "Open Autolab", exact: true }).click({ timeout: 90000 });
  await dialog.waitFor({ state: "detached" });
  const fake = await page.evaluate(() => window.__fakePi);
  assert(Math.max(...fake.chunks) <= 20, "Requests go in chunks of 20 bytes at most");
  assert.deepEqual(
    fake.states,
    ["connecting", "error", "connecting", "error", "wifi_connected", "gateway_connected"],
    "Keeping never joins a network",
  );
  await page.close();
};
