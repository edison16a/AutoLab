// Browser end to end suite. tests/run_e2e.py starts the gateway, the web app
// and a Pi simulator first, then runs this file.
const assert = require("assert");
const { launch, newPage } = require("./support.cjs");

const FLOWS = ["sign-in", "connect", "live", "computer-camera", "data", "hardware", "stats-settings", "mobile"];

(async () => {
  const browser = await launch();
  const errors = [];
  const page = await newPage(browser, errors);
  for (const name of FLOWS) {
    console.log(`flow: ${name}`);
    await require(`./flows/${name}.cjs`)(page);
  }
  console.log("flow: fallback");
  await require("./flows/fallback.cjs")(browser, newPage, errors);
  assert.deepEqual(errors, [], "No uncaught page errors");
  await browser.close();
  console.log("PASS: sign in, connect, live, computer camera, data, hardware, statistics, settings, mobile, fallback.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
