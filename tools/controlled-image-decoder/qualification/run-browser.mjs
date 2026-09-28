/* global document, window */

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const browserName = process.argv[2] ?? "chromium";
const browserType = { chromium, firefox }[browserName];
if (!browserType) throw new Error(`Unsupported browser: ${browserName}`);

const port = Number(process.env.QUALIFICATION_PORT ?? "4179");
const viteCli = resolve(here, "../../../node_modules/vite/bin/vite.js");
const server = spawn(
  process.execPath,
  [
    viteCli,
    "preview",
    "--config",
    resolve(here, "vite.config.ts"),
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ],
  { cwd: here, stdio: ["ignore", "pipe", "pipe"] },
);
let serverLog = "";
server.stdout.on("data", (chunk) => (serverLog += chunk));
server.stderr.on("data", (chunk) => (serverLog += chunk));

let browser;
try {
  await waitForServer(`http://127.0.0.1:${port}/`);
  const launchOptions = process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : {};
  browser = await browserType.launch({ headless: true, ...launchOptions });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => document.body.dataset.qualification !== "running",
    null,
    { timeout: 120_000 },
  );
  const result = await page.evaluate(() => window.__qualificationResult);
  result.browserName = browserName;
  result.environmentId =
    process.env.QUALIFICATION_ENVIRONMENT_ID ??
    `${browserName}-${process.platform}`;
  result.browserVersion = browser.version();
  result.consoleErrors = consoleErrors;
  if (consoleErrors.length !== 0) result.failures += consoleErrors.length;
  const outputPath = resolve(
    process.env.QUALIFICATION_RESULT ??
      resolve(here, `results/${browserName}-local.json`),
  );
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        outputPath,
        browserName,
        browserVersion: browser.version(),
        failures: result.failures,
      },
      null,
      2,
    ),
  );
  if (result.failures !== 0) process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
  await new Promise((resolveExit) => server.once("exit", resolveExit));
}

async function waitForServer(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null)
      throw new Error(`Vite exited early:\n${serverLog}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The bounded poll continues until preview is ready.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`Vite preview did not start:\n${serverLog}`);
}
