// Focus a part in context, inspect it on its own, then return.
const { openSection, assert, shot } = require("../support.cjs");

module.exports = async function hardware(page) {
  await openSection(page, "Hardware", "/hardware");
  await page.getByRole("img", { name: "3D model of the Autolab" }).waitFor({ timeout: 30000 });
  await page.locator('[data-component-id="camera"]').click();
  const details = page.getByRole("complementary", { name: "HQ Camera details" });
  await details.waitFor();
  await details.getByRole("button", { name: "Inspect item", exact: true }).click();
  await details.getByRole("button", { name: "Back to machine", exact: true }).click();
  await details.getByRole("button", { name: "Inspect item", exact: true }).waitFor();
  await page.waitForTimeout(1500);
  await shot(page, "hardware");

  const rows = page.locator("[data-component-id]");
  const all = await rows.count();
  await page.getByLabel("Search components", { exact: true }).fill("pico");
  assert.equal(await rows.count(), 1, "Search narrows the parts list");
  await page.getByLabel("Search components", { exact: true }).fill("");
  assert.equal(await rows.count(), all, "Clearing search shows every part");
};
