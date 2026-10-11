// Shared helpers for the browser end to end suite.
const assert = require("assert");
const { chromium } = require("@playwright/test");

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";

/**
 * Detection needs the YOLO model, which the build downloads. Sandboxes that
 * can't reach the model host set this to skip only the detection checks.
 * CI never sets it.
 */
const SKIP_DETECTION = process.env.AUTOLAB_E2E_SKIP_DETECTION === "1";

async function launch() {
  return chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-dev-shm-usage",
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  });
}

/**
 * A page that records uncaught errors so the run can fail on any of them.
 * Reduced motion makes camera flights and setup animations jump to their end,
 * so a slow CI runner rendering WebGL in software isn't busy animating while
 * the test clicks.
 */
async function newPage(browser, errors, viewport = { width: 1440, height: 950 }) {
  const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
  page.on("pageerror", (error) => {
    console.error(error.stack);
    errors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") console.error("console:", message.text());
  });
  return page;
}

/** Opens a section from the top nav and waits for the route to change. */
async function openSection(page, name, path) {
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name, exact: true }).click();
  await page.waitForURL(`**${path}`);
}

async function assertNoSideScroll(page, where) {
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  assert(fits, `No horizontal scroll on ${where}`);
}

/**
 * Saves a picture for debugging a failed run. It's not a check, so a slow
 * software renderer that misses the deadline only logs a note.
 */
async function shot(page, name) {
  try {
    await page.screenshot({ path: `/tmp/autolab-${name}.png`, timeout: 60000 });
  } catch (error) {
    console.warn(`screenshot ${name} skipped: ${error.message.split("\n")[0]}`);
  }
}

/**
 * A password field's eye button shows what was typed and hides it again.
 * A click leaves focus and the caret in the field. `noun` is what the
 * button names, like "password" or "PIN".
 */
async function assertShowButton(scope, input, noun) {
  const show = scope.getByRole("button", { name: `Show ${noun}`, exact: true });
  const hide = scope.getByRole("button", { name: `Hide ${noun}`, exact: true });
  assert.equal(await input.getAttribute("type"), "password", `The ${noun} starts hidden`);
  // The name says what a press does, so a pressed state would contradict it.
  assert.equal(await show.getAttribute("aria-pressed"), null, `Show ${noun} has no pressed state`);
  await input.evaluate((field) => {
    field.focus();
    field.setSelectionRange(2, 2);
  });
  await show.click();
  assert.equal(await input.getAttribute("type"), "text", `Show ${noun} shows it`);
  assert.equal(await hide.getAttribute("aria-pressed"), null, `Hide ${noun} has no pressed state`);
  const caret = await input.evaluate((field) => [document.activeElement === field, field.selectionStart]);
  assert.deepEqual(caret, [true, 2], `Show ${noun} leaves focus and the caret in the field`);
  // From the keyboard too.
  await hide.press("Enter");
  assert.equal(await input.getAttribute("type"), "password", `Hide ${noun} hides it again`);
}

module.exports = { BASE, SKIP_DETECTION, launch, newPage, openSection, assertNoSideScroll, assertShowButton, shot, assert };
