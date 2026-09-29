// Browser end to end suite. tests/run_e2e.py starts the gateway, the web app
// and a Pi simulator first, then runs this file.
const assert = require("assert");
const { launch, newPage, shot } = require("./support.cjs");

const FLOWS = ["sign-in", "connect", "live", "computer-camera", "data", "hardware", "stats-settings", "mobile"];

/**
 * What the page looked like when a flow failed. A timeout alone says what
 * was missing, not what was there instead, and CI keeps nothing else.
 */
async function reportFailure(page) {
  if (!page) return;
  try {
    console.error(`failed at ${page.url()}`);
    const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 1200));
    console.error(`page text: ${text}`);
  } catch (error) {
    console.error(`page text unavailable: ${error.message.split("\n")[0]}`);
  }
  await shot(page, "failure");
}

let page;
(async () => {
  const browser = await launch();
  const errors = [];
  page = await newPage(browser, errors);
  for (const name of FLOWS) {
    console.log(`flow: ${name}`);
    await require(`./flows/${name}.cjs`)(page);
  }
  console.log("flow: fallback");
  await require("./flows/fallback.cjs")(browser, newPage, errors);
  assert.deepEqual(errors, [], "No uncaught page errors");
  await browser.close();
  console.log("PASS: sign in, connect, live, computer camera, data, hardware, statistics, settings, mobile, fallback.");
})().catch(async (error) => {
  console.error(error);
  await reportFailure(page);
  process.exit(1);
});
