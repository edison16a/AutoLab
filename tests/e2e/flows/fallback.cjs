// Without WebGL2 the 3D views explain themselves and setup still works.
const { BASE } = require("../support.cjs");

module.exports = async function fallback(browser, newPage, errors) {
  const page = await newPage(browser, errors);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : original.call(this, type, ...args);
    };
    localStorage.setItem("autolab:session", JSON.stringify({ id: "demo-ntabuser", email: "ntabuser", name: "ntabuser" }));
  });
  await page.goto(BASE + "/hardware");
  await page.getByText("3D view is unavailable in this browser.", { exact: true }).first().waitFor();
  await page.getByRole("banner").getByRole("button", { name: "Connect device", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Connect device" });
  await dialog.getByText("3D view is unavailable in this browser.", { exact: true }).waitFor();
  await dialog.getByRole("button", { name: "Camera connected", exact: true }).click();
  await dialog.getByRole("button", { name: "Raspberry Pi is powered on", exact: true }).waitFor();
  await page.close();
};
