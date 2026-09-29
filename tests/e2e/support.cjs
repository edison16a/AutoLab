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

/** A page that records uncaught errors so the run can fail on any of them. */
async function newPage(browser, errors, viewport = { width: 1440, height: 950 }) {
  const page = await browser.newPage({ viewport });
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

async function shot(page, name) {
  await page.screenshot({ path: `/tmp/autolab-${name}.png` });
}

module.exports = { BASE, SKIP_DETECTION, launch, newPage, openSection, assertNoSideScroll, shot, assert };
