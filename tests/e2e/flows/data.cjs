// Library, image detail with analysis, delete, and persistence across a reload.
const { SKIP_DETECTION, openSection, assert, shot } = require("../support.cjs");

module.exports = async function data(page) {
  await openSection(page, "Data", "/data");
  const cards = page.locator(".photo-card");
  await cards.first().waitFor();
  assert.equal(await cards.count(), 2, "The Pi capture and the upload are both in the library");

  await cards.first().locator("a.photo-card__link").click();
  await page.waitForURL("**/data/**");
  if (!SKIP_DETECTION) {
    const analyze = page.getByRole("button", { name: /^Analyze (image|again)$/ });
    await analyze.click();
    await page.getByText("YOLOv10n", { exact: true }).waitFor({ timeout: 120000 });
  }
  await shot(page, "image");
  await page.keyboard.press("Escape");
  await page.waitForURL("**/data");

  await cards.first().hover();
  await cards.first().getByRole("button", { name: "Delete photo" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".photo-card").length === 1);

  // Demo images live in IndexedDB, so a reload keeps them and the session.
  await page.reload();
  await cards.first().waitFor();
  assert.equal(await cards.count(), 1, "Library survives a reload");
};
