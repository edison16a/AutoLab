// Demo mode only accepts the fixed demo account, and the password can be shown.
const { BASE, assert, assertShowButton } = require("../support.cjs");

module.exports = async function signIn(page) {
  await page.goto(BASE);
  await page.waitForURL("**/login");
  await page.getByLabel("Username", { exact: true }).fill("someone");
  await page.getByLabel("Password", { exact: true }).fill("wrong");
  await assertShowButton(page, page.getByLabel("Password", { exact: true }), "password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByText("Wrong username or password.", { exact: true }).waitFor();

  await page.getByLabel("Username", { exact: true }).fill("ntabuser");
  await page.getByLabel("Password", { exact: true }).fill("ntabuser123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(BASE + "/");
  await page.getByRole("heading", { level: 1, name: "Autolab" }).waitFor();
  await page.getByRole("img", { name: "3D model of the Autolab" }).waitFor({ timeout: 30000 });
  assert(await page.locator("link[rel='icon']").count(), "Favicon is linked");
};
