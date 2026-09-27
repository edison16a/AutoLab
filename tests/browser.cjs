const { chromium } = require("@playwright/test");
const fs = require("fs");
const assert = require("assert");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:3000");
  await page.getByRole("heading", { name: "Your lab, in view." }).waitFor();
  assert.equal(await page.getByText("Sign in", { exact: true }).count(), 0);
  await page
    .getByRole("button", { name: "Connect device", exact: true })
    .click();
  await page
    .getByLabel("Device ID", { exact: true })
    .fill(process.env.TEST_DEVICE_ID);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Connect device", exact: true })
    .click();
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
  console.log(
    "PASS: capture, live preview, saved/live simulated analysis, delete, mobile, refresh reset, no browser persistence, no runtime errors",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
