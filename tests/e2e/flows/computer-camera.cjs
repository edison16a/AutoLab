// Webcam start and stop, then an upload that runs the real detector.
const { SKIP_DETECTION, assert } = require("../support.cjs");

module.exports = async function computerCamera(page) {
  await page.getByRole("tab", { name: "Computer camera", exact: true }).click();
  await page.getByRole("button", { name: "Start computer camera", exact: true }).click();
  await page.getByRole("button", { name: "Stop camera", exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector("video")?.srcObject?.active);
  await page.getByRole("button", { name: "Stop camera", exact: true }).click();
  assert(await page.locator("video").evaluate((v) => v.srcObject === null), "Camera stream released");

  await page.getByLabel("Upload image", { exact: true }).setInputFiles(process.env.DETECTION_TEST_IMAGE);
  if (SKIP_DETECTION) {
    await page.getByText(/Saved/).first().waitFor({ timeout: 30000 });
    return;
  }
  const result = page.locator(".detection-result");
  await result.waitFor({ timeout: 120000 });
  const text = await result.innerText();
  assert(/car|person|bicycle/.test(text), `Detector finds street objects: ${text}`);
  const ratios = await page.locator(".webcam-stage .image-view").evaluate((view) => {
    const img = view.querySelector("img");
    const canvas = view.querySelector("canvas");
    return { image: img.naturalWidth / img.naturalHeight, overlay: canvas.clientWidth / canvas.clientHeight };
  });
  assert(Math.abs(ratios.image - ratios.overlay) < 0.01, "Overlay keeps the image aspect ratio");
};
