// Every screen fits a phone without sideways scrolling, then sign out works.
const { BASE, assertNoSideScroll, shot } = require("../support.cjs");

const PATHS = ["/", "/live", "/data", "/statistics", "/hardware", "/settings"];

module.exports = async function mobile(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of PATHS) {
    await page.goto(BASE + path);
    await page.getByRole("navigation", { name: "Sections" }).waitFor();
    await page.waitForTimeout(800);
    await assertNoSideScroll(page, path);
  }
  await shot(page, "mobile");
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL("**/login");
};
