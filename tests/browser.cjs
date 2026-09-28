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
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  const errors = [];
  page.on("pageerror", (e) => {
    console.error(e.stack);
    errors.push(e.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") console.error(message.text());
  });
  await page.goto("http://localhost:3000");
  await page
    .getByRole("heading", { name: "Components", exact: true })
    .waitFor();
  assert.equal(
    await page.locator(".brand-icon, .demo-banner, .session-card").count(),
    0,
  );
  assert(
    !/clear on refresh|demo mode|temporary session/i.test(
      await page.locator("body").innerText(),
    ),
  );
  await page.locator(".twin-canvas canvas").waitFor();
  await page.waitForTimeout(1400);
  // A stationary pointer keeps the same label even after highlight geometry appears.
  const bounds = await page.locator(".twin-canvas").boundingBox();
  let hovered = false;
  for (const y of [0.6, 0.5, 0.4, 0.7, 0.3]) {
    for (const x of [0.6, 0.55, 0.5, 0.65, 0.45, 0.7, 0.4]) {
      await page.mouse.move(
        bounds.x + bounds.width * x,
        bounds.y + bounds.height * y,
      );
      await page.waitForTimeout(50);
      if (await page.locator(".twin-label").count()) {
        const label = await page.locator(".twin-label").innerText();
        for (let i = 0; i < 4; i++) {
          await page.mouse.move(
            bounds.x + bounds.width * x,
            bounds.y + bounds.height * y,
          );
          await page.waitForTimeout(60);
          assert.equal(
            await page.locator(".twin-label").innerText(),
            label,
            "Hover label stays stable",
          );
        }
        hovered = true;
        break;
      }
    }
    if (hovered) break;
  }
  assert(hovered, "Component hit areas respond to real pointer events");
  await page.mouse.move(0, 0);
  await page.screenshot({ path: "/tmp/autolab-home.png", fullPage: true });
  await page
    .getByRole("button", { name: "Connect device", exact: true })
    .click();
  await page.getByRole("dialog").locator("canvas").waitFor();
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
    .click({ timeout: 20000 });
  await page.getByRole("button", { name: "Live camera", exact: true }).click();
  await page
    .getByText("Ready to capture", { exact: true })
    .waitFor({ timeout: 20000 });
  await page
    .getByRole("button", { name: "Start preview", exact: true })
    .last()
    .click();
  await page.locator(".camera-viewport img").waitFor();
  await page.getByRole("button", { name: "Take photo", exact: true }).click();
  await page
    .getByRole("button", { name: "Image library", exact: false })
    .click();
  await page.locator(".photo-thumb").first().click();
  await page
    .getByRole("button", { name: "Analyze image", exact: true })
    .click();
  await Promise.race([
    page.getByText("YOLOv10n", { exact: true }).waitFor({ timeout: 125000 }),
    page
      .locator(".toast")
      .waitFor({ timeout: 125000 })
      .then(async () => {
        throw new Error(await page.locator(".toast").innerText());
      }),
  ]).catch(async (error) => {
    console.error(await page.locator("body").innerText());
    throw error;
  });
  await page.getByRole("button", { name: "Close image", exact: true }).click();
  await page.getByRole("button", { name: "Live camera", exact: true }).click();
  await page.getByRole("switch", { name: "Detect objects" }).click();
  await page.getByText(/^Ready \((CPU|WebGPU)\)$/).waitFor({ timeout: 30000 });
  await page.getByRole("switch", { name: "Detect objects" }).click();
  await page.getByRole("button", { name: "Components", exact: true }).click();
  await page.waitForURL("**/components");
  await page.locator('[data-component-id="sht85"]').click();
  await page
    .getByRole("complementary", { name: "Component details" })
    .getByText("No sensor readings available", { exact: true })
    .waitFor();
  await page.getByLabel("Search components", { exact: true }).fill("CO₂");
  assert.equal(await page.locator("[data-component-id]").count(), 1);
  await page.getByLabel("Search components", { exact: true }).fill("");
  await page.locator('[data-component-id="raspberry_pi"]').click();
  assert.equal(
    await page
      .getByRole("button", { name: "Isolate part", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.waitForTimeout(1400);
  await page
    .locator(".digital-twin")
    .screenshot({ path: "/tmp/autolab-pi-detail.png" });
  await page.locator('[data-component-id="camera"]').click();
  await page.waitForTimeout(1200);
  await page
    .locator(".digital-twin")
    .screenshot({ path: "/tmp/autolab-camera-detail.png" });
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await page
    .getByRole("button", { name: "Exploded view", exact: true })
    .click();
  await page.getByRole("button", { name: "Connections", exact: true }).click();
  await page.getByRole("button", { name: "Connections", exact: true }).click();
  await page
    .getByRole("button", { name: "Exploded view", exact: true })
    .click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/tmp/autolab-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/autolab-mobile.png", fullPage: true });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "No mobile overflow",
  );
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.getByRole("button", { name: "Live camera", exact: true }).click();
  await page
    .getByRole("button", { name: "Computer camera", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start computer camera", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Stop camera", exact: true })
    .waitFor();
  await page.waitForFunction(() => {
    const v = document.querySelector("video");
    return v?.srcObject?.active;
  });
  await page.getByRole("button", { name: "Stop camera", exact: true }).click();
  assert(
    await page.locator("video").evaluate((v) => v.srcObject === null),
    "Camera stream released",
  );
  await page
    .getByLabel("Upload image", { exact: true })
    .setInputFiles(process.env.DETECTION_TEST_IMAGE);
  await page.locator(".detection-result").waitFor({ timeout: 120000 });
  const result = await page.locator(".detection-result").innerText();
  assert(
    /car|person|bicycle/.test(result),
    "Actual model detects expected objects in street photo: " + result,
  );
  const overlaySize = await page
    .locator(".browser-camera .image-stage")
    .evaluate((stage) => {
      const img = stage.querySelector("img");
      const canvas = stage.querySelector("canvas");
      return {
        imageRatio: img.naturalWidth / img.naturalHeight,
        overlayRatio: canvas.clientWidth / canvas.clientHeight,
      };
    });
  assert(
    Math.abs(overlaySize.imageRatio - overlaySize.overlayRatio) < 0.01,
    "Detection overlay preserves the uploaded image aspect ratio",
  );
  await page.screenshot({ path: "/tmp/autolab-detection.png", fullPage: true });
  await page
    .getByRole("button", { name: "Image library", exact: false })
    .click();
  assert.equal(
    await page.locator(".photo-card").count(),
    2,
    "Captures survive navigation",
  );
  page.on("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Delete photo", exact: true })
    .first()
    .click();
  assert.equal(await page.locator(".photo-card").count(), 1);
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  assert.equal(await page.evaluate(() => sessionStorage.length), 0);
  await page.reload();
  await page
    .getByRole("heading", { name: "Components", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Image library", exact: false })
    .click();
  assert.equal(await page.locator(".photo-card").count(), 0);
  assert.deepEqual(errors, []);
  const fallback = await browser.newPage();
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : original.call(this, type, ...args);
    };
  });
  await fallback.goto("http://localhost:3000");
  await fallback
    .getByText("3D view is unavailable in this browser.", { exact: true })
    .waitFor();
  await fallback
    .getByRole("button", { name: "Connect device", exact: true })
    .click();
  await fallback
    .getByRole("dialog")
    .getByText("3D view is unavailable in this browser.", { exact: true })
    .waitFor();
  await fallback
    .getByRole("button", { name: "Camera connected", exact: true })
    .click();
  await fallback
    .getByRole("button", { name: "Raspberry Pi is powered on", exact: true })
    .waitFor();
  await browser.close();
  console.log(
    "PASS: 3D home, stable hover, detailed models, onboarding, real ONNX photo detection, Pi capture/preview, computer camera lifecycle, mobile, refresh reset, fallback, no runtime errors.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
