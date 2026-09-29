// Statistics reflect the library, and the theme can be switched in Settings.
const { openSection, assert } = require("../support.cjs");

module.exports = async function statsAndSettings(page) {
  await openSection(page, "Statistics", "/statistics");
  // Match the label exactly: other tiles mention captures in their sub line.
  const label = page.locator(".stats-tile__label", { hasText: /^Captures$/ });
  const captures = page.locator(".stats-tile", { has: label }).locator(".stats-tile__value");
  await captures.waitFor();
  assert.equal((await captures.innerText()).trim(), "1", "Statistics count the library");

  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await page.waitForURL("**/settings");
  await page.getByRole("tab", { name: "Dark", exact: true }).click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
  await page.getByRole("tab", { name: "Light", exact: true }).click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "light");
};
