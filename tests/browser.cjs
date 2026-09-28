const { chromium } = require("@playwright/test");
const assert = require("assert");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-dev-shm-usage",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  const errors = [];
  page.on("pageerror", (e) => {
    console.error("Browser error at", page.url(), e.stack);
    errors.push(e.message);
  });
  await page.goto("http://localhost:3000");
  await page.getByRole("heading", { name: "Your lab, in view." }).waitFor();
  assert.equal(await page.getByText("Sign in", { exact: true }).count(), 0);
  await page
    .getByRole("button", { name: "Connect device", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Connect the camera", exact: true })
    .waitFor();
  await page
    .locator('canvas[aria-label="Interactive 3D Autolab machine"]')
    .waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/autolab-onboarding.png" });
  await page
    .getByRole("button", { name: "Camera connected", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Raspberry Pi is powered on", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use manual Wi-Fi setup", exact: true })
    .click();
  await page
    .getByLabel("Device ID", { exact: true })
    .fill(process.env.TEST_DEVICE_ID);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Connect device", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open Autolab", exact: true })
    .waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "Open Autolab", exact: true }).click();
  await page
    .getByText("Ready to capture", { exact: true })
    .waitFor({ timeout: 20000 });
  await page
    .getByRole("button", { name: "Start preview", exact: true })
    .last()
    .click();
  await page.locator(".camera-viewport img").waitFor();
  await page
    .getByRole("button", { name: "Take photo", exact: true })
    .first()
    .click();
  await page.locator(".photo-card").waitFor();
  await page.locator(".photo-thumb").first().click();
  await page
    .getByRole("button", { name: "Analyze image", exact: true })
    .click();
  await page
    .getByText("simulator (not ML)", { exact: true })
    .waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "Close image", exact: true }).click();
  await page.getByRole("switch", { name: "Live ML" }).click();
  await page.getByRole("button", { name: "Components", exact: true }).click();
  await page.waitForURL("**/components");
  await page
    .locator('canvas[aria-label="Interactive 3D Autolab machine"]')
    .waitFor();
  await page.locator('[data-component-id="sht85"]').click();
  await page
    .getByRole("complementary", { name: "Component details" })
    .getByText("No sensor readings available", { exact: true })
    .waitFor();
  await page.getByLabel("Search components", { exact: true }).fill("CO₂");
  assert.equal(await page.locator("[data-component-id]").count(), 1);
  await page.getByLabel("Search components", { exact: true }).fill("");
  await page.locator('[data-component-id="raspberry_pi"]').click();
  await page
    .getByRole("complementary", { name: "Component details" })
    .getByText("1.1.0", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Exploded view", exact: true })
    .click();
  await page.getByRole("button", { name: "Connections", exact: true }).click();
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  assert.equal(
    await page.locator(".photo-card").count(),
    1,
    "Route navigation preserves capture memory",
  );

  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "/tmp/autolab-desktop.png", fullPage: true });
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  assert.equal(await page.evaluate(() => sessionStorage.length), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "/tmp/autolab-mobile.png", fullPage: true });
  const imageSize = await page.locator(".camera-viewport img").boundingBox();
  assert(
    Math.abs(imageSize.width / imageSize.height - 4 / 3) < 0.01,
    "Camera overlay uses the image aspect ratio",
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "No horizontal overflow",
  );
  page.on("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Delete photo", exact: true })
    .first()
    .click();
  assert.equal(await page.locator(".photo-card").count(), 0);
  await page
    .getByRole("button", { name: "Take photo", exact: true })
    .first()
    .click();
  await page.locator(".photo-card").waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "Your lab, in view." }).waitFor();
  assert.equal(await page.locator(".photo-card").count(), 0);
  assert.equal(
    await page.getByText("No device selected", { exact: true }).count(),
    1,
  );
  assert.deepEqual(errors, []);
  const fallbackPage = await browser.newPage();
  await fallbackPage.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : original.call(this, type, ...args);
    };
  });
  await fallbackPage.goto("http://localhost:3000");
  await fallbackPage
    .getByRole("button", { name: "Connect device", exact: true })
    .click();
  await fallbackPage
    .getByText("3D view is unavailable in this browser.", { exact: true })
    .waitFor();
  await fallbackPage
    .getByRole("button", { name: "Camera connected", exact: true })
    .click();
  await fallbackPage
    .getByRole("button", { name: "Raspberry Pi is powered on", exact: true })
    .waitFor();
  await fallbackPage.close();
  console.log(
    "PASS: WebGL scene, onboarding, component route/state, WebGL fallback, capture, preview, simulated analysis, delete, mobile, refresh reset, no browser persistence or runtime errors",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
