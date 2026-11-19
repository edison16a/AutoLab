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

  // Live view and Exploded view switch each other off. Stop it again right away:
  // software rendering in CI would otherwise draw the demo for the rest of the run.
  const toolbar = page.getByRole("toolbar", { name: "View" });
  const exploded = toolbar.getByRole("button", { name: "Exploded view", exact: true });
  const live = toolbar.getByRole("button", { name: "Live view", exact: true });
  await exploded.click();
  await live.click();
  assert.equal(await live.getAttribute("aria-pressed"), "true", "Live view turns on");
  assert.equal(await exploded.getAttribute("aria-pressed"), "false", "Live view closes the exploded view");
  await live.click();
  assert.equal(await live.getAttribute("aria-pressed"), "false", "Live view turns off");

  const rows = page.locator("[data-component-id]");
  const all = await rows.count();
  await page.getByLabel("Search components", { exact: true }).fill("pico");
  assert.equal(await rows.count(), 1, "Search narrows the parts list");
  await page.getByLabel("Search components", { exact: true }).fill("fluidics");
  assert.equal(await rows.count(), 7, "The fluidics group holds the head, both pumps, their controllers and both valves");
  await page.locator('[data-component-id="aspiration_pump"]').click();
  await page.getByRole("complementary", { name: "Aspiration pump details" }).waitFor();
  await page.getByLabel("Search components", { exact: true }).fill("");
  assert.equal(await rows.count(), all, "Clearing search shows every part");
};
