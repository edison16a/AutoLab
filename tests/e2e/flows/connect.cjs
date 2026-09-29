// The manual path through the connect wizard, ending on a real heartbeat.
module.exports = async function connect(page) {
  await page.getByRole("banner").getByRole("button", { name: "Connect device", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Connect device" });
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "Camera connected", exact: true }).click();
  await dialog.getByRole("button", { name: "Raspberry Pi is powered on", exact: true }).click();
  await dialog.getByRole("button", { name: "Find Autolab", exact: true }).waitFor();
  await dialog.getByRole("button", { name: "Use manual Wi-Fi setup", exact: true }).click();
  await dialog.getByLabel("Device ID", { exact: true }).fill(process.env.TEST_DEVICE_ID);
  await dialog.getByRole("button", { name: "Connect device", exact: true }).click();
  await dialog.getByRole("button", { name: "Open Autolab", exact: true }).click({ timeout: 30000 });
  await dialog.waitFor({ state: "detached" });
};
