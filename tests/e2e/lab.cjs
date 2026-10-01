// Lab mode end to end, run by tests/run_lab_e2e.py against a local Supabase
// with a simulated Pi that talks to Supabase itself. Two screens on one
// account, then a stranger, then the Pi goes away.
const { BASE, SKIP_DETECTION, assert, launch, newPage } = require("./support.cjs");

const CODE = process.env.TEST_SETUP_CODE;
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
  await dialog.getByLabel("Setup code", { exact: true }).fill(CODE);
  await dialog.getByRole("button", { name: "Connect device", exact: true }).click();
  return dialog;
}

async function watchLive(page) {
  await page.goto(BASE + "/live");
  // Frames come from the Pi over the Autolab's private Realtime channel.
  await page.locator(".image-view img").first().waitFor({ timeout: 45000 });
}

async function main() {
  const browser = await launch();
  const errors = [];
  try {
    step("an owner signs up and links the Pi with its setup code");
    const first = await newPage(browser, errors);
    await signIn(first, OWNER, true);
    await first.getByText("No commands yet").waitFor();
    const dialog = await addDevice(first);
    // Ready only comes once the Pi itself reports online with its camera.
    await dialog.getByRole("button", { name: "Open Autolab", exact: true }).click({ timeout: 90000 });
    await first.goto(BASE + "/settings");
    await first.getByText("Images are stored in Supabase").waitFor();
    assert.equal(await first.getByRole("textbox", { name: /gateway/i }).count(), 0, "Lab mode has no gateway setting");

    step("the live view streams from the Pi and a photo comes back through Supabase");
    await watchLive(first);
    await first.getByRole("button", { name: "Take photo", exact: true }).click();
    await toast(first, "Photo saved", 60000);

    step("a second screen sees the status, the photo and the log, and has its own live view");
    const second = await newPage(browser, errors);
    await signIn(second, OWNER, false);
    await second.locator(".home-device").getByText("Online").first().waitFor({ timeout: 45000 });
    await second.locator(".home-capture:not(.home-capture--skeleton)").first().waitFor({ timeout: 30000 });
    const log = second.locator(".home-actions__list");
    await log.locator(".home-action", { hasText: "Take photo" }).getByText("Saved to Data").first().waitFor({ timeout: 20000 });
    await log.getByText("Start preview").first().waitFor();
    await watchLive(second);
    await second.getByRole("button", { name: "Take photo", exact: true }).click();
    await toast(second, "Photo saved", 60000);

    step("the photo opens from its log entry with a signed link");
    await second.goto(BASE + "/");
    await second.locator(".home-action__link").first().click();
    await second.waitForURL(/\/data\/[0-9a-f-]+$/);
    const src = await second.locator(".image-view img").first().getAttribute("src", { timeout: 20000 });
    assert(src && src.includes("/storage/v1/object/sign/autolab-images/"), `Signed storage link, got ${src}`);
    const photoId = second.url().split("/").pop();

    if (!SKIP_DETECTION) {
      step("an analysis on one screen shows on the other");
      await second.getByRole("button", { name: /^Analyze (image|again)$/ }).click();
      await second.getByText(/^Analyzed /).first().waitFor({ timeout: 120000 });
      await first.goto(BASE + `/data/${photoId}`);
      await first.getByText(/^Analyzed /).first().waitFor({ timeout: 20000 });
    }

    step("a photo deleted on one screen leaves the other");
    await first.goto(BASE + "/data");
    const card = first.locator(`.photo-card[data-photo-id="${photoId}"]`);
    await card.waitFor({ timeout: 20000 });
    await second.goto(BASE + `/data/${photoId}`);
    await second.locator(".image-panel__delete").click();
    await second.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
    await card.waitFor({ state: "detached", timeout: 20000 });

    step("a stranger sees nothing and can't take the Autolab");
    const stranger = await newPage(browser, errors);
    await signIn(stranger, STRANGER, true);
    await stranger.getByText("No commands yet").waitFor();
    await stranger.getByText("No photos yet").waitFor({ timeout: 20000 });
    const refused = await addDevice(stranger);
    await refused.getByText("This Autolab is linked to another account.").waitFor({ timeout: 20000 });

    step("with the Pi gone, a command expires and the Autolab shows offline");
    process.kill(Number(process.env.TEST_PI_PID));
    await first.goto(BASE + "/live");
    await first.getByRole("button", { name: "Take photo", exact: true }).click();
    await toast(first, "didn't pick this up", 40000);
    await first.goto(BASE + "/");
    await first.locator(".home-action", { hasText: "Not picked up" }).first().waitFor({ timeout: 20000 });
    // Three missed reports at most.
    await first.locator(".home-device").getByText("Offline").first().waitFor({ timeout: 60000 });

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
