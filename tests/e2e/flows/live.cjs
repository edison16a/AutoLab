// Pi preview, a full resolution capture and live detection.
const { SKIP_DETECTION, openSection, shot } = require("../support.cjs");

module.exports = async function live(page) {
  await openSection(page, "Live", "/live");
  await page.getByRole("tab", { name: "Autolab camera", exact: true }).waitFor();
  const stage = page.getByRole("region", { name: "Autolab camera view" });
  await stage.locator(".live-stage__view img").waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "Take photo", exact: true }).click();
  await page.getByText("Photo saved", { exact: true }).waitFor({ timeout: 30000 });
  await shot(page, "live");
  if (SKIP_DETECTION) return;
  const detect = page.locator(".live-controls").getByRole("switch", { name: "Detect objects" });
  await detect.click();
  await page.getByText(/^Ready \((CPU|WebGPU)\)$/).waitFor({ timeout: 60000 });
  await detect.click();
};
