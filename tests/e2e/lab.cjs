// Lab mode end to end, run by tests/run_lab_e2e.py against a local Supabase:
// a station and a remote screen on one account, then a stranger.
const { BASE, SKIP_DETECTION, assert, launch, newPage } = require("./support.cjs");

const DEVICE = process.env.TEST_DEVICE_ID;
const stamp = Date.now();
const OWNER = { email: `owner${stamp}@lab.test`, password: "labpass123" };
const STRANGER = { email: `stranger${stamp}@lab.test`, password: "labpass123" };

const step = (text) => console.log(`lab: ${text}`);
const toast = (page, text, timeout = 30000) => page.getByText(text).first().waitFor({ timeout });

/** Local Supabase confirms emails at once, so a new account is signed in straight away. */
async function signIn(page, who, create) {
  await page.goto(BASE + "/login");
  if (create) await page.getByRole("button", { name: "Create an account", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(who.email);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: create ? "Create account" : "Sign in", exact: true }).click();
  await page.waitForURL(BASE + "/", { timeout: 30000 });
}

async function addDevice(page) {
  await page.getByRole("banner").getByRole("button", { name: "Connect device", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Connect device" });
  await dialog.getByRole("button", { name: "Camera connected", exact: true }).click();
  await dialog.getByRole("button", { name: "Raspberry Pi is powered on", exact: true }).click();
  await dialog.getByRole("button", { name: "Use manual Wi-Fi setup", exact: true }).click();
  await dialog.getByLabel("Device ID", { exact: true }).fill(DEVICE);
  await dialog.getByRole("button", { name: "Connect device", exact: true }).click();
  return dialog;
}

async function main() {
  const browser = await launch();
  const errors = [];
  try {
    step("the lab computer signs up, adds the Autolab and becomes the station");
    const station = await newPage(browser, errors);
    await signIn(station, OWNER, true);
    await station.getByText("No commands yet").waitFor();
    const dialog = await addDevice(station);
    await dialog.getByRole("button", { name: "Open Autolab", exact: true }).click({ timeout: 90000 });
    await station.goto(BASE + "/settings");
    assert.equal(await station.getByRole("switch", { name: "Lab computer" }).getAttribute("aria-checked"), "true");
    await station.getByText("Images are stored in Supabase").waitFor();

    step("the station takes a photo over the WebSocket");
    await station.goto(BASE + "/live");
    await station.locator(".image-view img").first().waitFor({ timeout: 45000 });
    await station.getByRole("button", { name: "Take photo", exact: true }).click();
    await toast(station, "Photo saved", 70000);

    step("a remote screen sees the status, the photo and the log");
    const remote = await newPage(browser, errors);
    await signIn(remote, OWNER, false);
    await remote.locator(".home-device").getByText("Online").first().waitFor({ timeout: 45000 });
    await remote.locator(".home-capture:not(.home-capture--skeleton)").first().waitFor({ timeout: 30000 });
    const log = remote.locator(".home-actions__list");
    await log.getByText("Take photo").first().waitFor({ timeout: 20000 });
    await log.getByText("From the lab computer").first().waitFor();

    step("the remote screen has no live view but takes a photo through the station");
    await remote.goto(BASE + "/live");
    await remote.getByText("Live view runs on the lab computer").waitFor({ timeout: 20000 });
    assert(await remote.getByRole("button", { name: /preview/ }).isDisabled(), "Preview is off on a remote screen");
    await remote.getByRole("button", { name: "Take photo", exact: true }).click();
    await toast(remote, "Photo saved", 90000);
    await station.goto(BASE + "/");
    const entry = station.locator(".home-action", { hasText: "From another screen" }).first();
    await entry.waitFor({ timeout: 20000 });
    assert((await entry.textContent()).includes("Done"), "The station finished the remote command");

    step("the photo opens from its log entry with a signed link");
    await remote.goto(BASE + "/");
    await remote.locator(".home-action", { hasText: "From another screen" }).locator(".home-action__link").first().click();
    await remote.waitForURL(/\/data\/[0-9a-f-]+$/);
    const src = await remote.locator(".image-view img").first().getAttribute("src", { timeout: 20000 });
    assert(src && src.includes("/storage/v1/object/sign/autolab-images/"), `Signed storage link, got ${src}`);
    const photoId = remote.url().split("/").pop();

    if (!SKIP_DETECTION) {
      step("an analysis on the remote screen shows on the station");
      await remote.getByRole("button", { name: /^Analyze (image|again)$/ }).click();
      await remote.getByText(/^Analyzed /).first().waitFor({ timeout: 120000 });
      await station.goto(BASE + `/data/${photoId}`);
      await station.getByText(/^Analyzed /).first().waitFor({ timeout: 20000 });
    }

    step("a photo deleted on one screen leaves the other");
    await station.goto(BASE + "/data");
    const card = station.locator(`.photo-card[data-photo-id="${photoId}"]`);
    await card.waitFor({ timeout: 20000 });
    await remote.goto(BASE + `/data/${photoId}`);
    await remote.locator(".image-panel__delete").click();
    await remote.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
    await card.waitFor({ state: "detached", timeout: 20000 });

    step("a stranger sees nothing and can't add someone else's Autolab");
    const stranger = await newPage(browser, errors);
    await signIn(stranger, STRANGER, true);
    await stranger.getByText("No commands yet").waitFor();
    await stranger.getByText("No photos yet").waitFor({ timeout: 20000 });
    const refused = await addDevice(stranger);
    await refused.getByText("This Autolab is linked to another account.").waitFor({ timeout: 20000 });

    step("once this computer stops being the station, a remote command expires");
    await station.goto(BASE + "/settings");
    await station.getByRole("switch", { name: "Lab computer" }).click();
    await remote.goto(BASE + "/live");
    await remote.getByRole("button", { name: "Take photo", exact: true }).click();
    await toast(remote, "didn't pick this up", 40000);
    await remote.goto(BASE + "/");
    await remote.locator(".home-action", { hasText: "Not picked up" }).first().waitFor({ timeout: 20000 });

    assert.deepEqual(errors, [], "No uncaught page errors");
    console.log("lab: all checks passed");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
