// Full-page screenshot through the Chrome DevTools Protocol with real device-metrics emulation.
// Usage: node .qa/shot.mjs <url> <width> <height> <out.png> [mobile=1]
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [url, width, height, out, mobile = "1", wait = "4500", rest = "0", run = ""] = process.argv.slice(2);
const port = 9400 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "shot-"));
const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "about:blank"],
  { stdio: "ignore" }
);

const finish = (code) => {
  try { execSync(`taskkill /PID ${chrome.pid} /T /F`, { stdio: "ignore" }); } catch {}
  process.exit(code);
};
setTimeout(() => { console.error("timed out"); finish(1); }, 90000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let version;
for (let i = 0; i < 60 && !version; i++) {
  try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(250); }
}
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
};
const send = (method, params = {}, sessionId) =>
  new Promise((resolve) => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params, sessionId })); });

const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride", { width: +width, height: +height, deviceScaleFactor: 1, mobile: mobile === "1" }, sessionId);
if (mobile === "1") await send("Emulation.setTouchEmulationEnabled", { enabled: true }, sessionId);
if (rest === "1") await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }, sessionId);
await send("Page.navigate", { url }, sessionId);
await sleep(+wait);
if (run) { await send("Runtime.evaluate", { expression: run }, sessionId); await sleep(1200); }
const { result: { data } } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, sessionId);
fs.writeFileSync(out, Buffer.from(data, "base64"));
console.log(`written ${out} (${width}x${height})`);
finish(0);
