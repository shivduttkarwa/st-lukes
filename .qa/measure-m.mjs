// Section offsets of a built page at a phone width, to line the build up against the mobile frames.
// Usage: node .qa/measure-m.mjs <url> <width> [selector]
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [url, width = "375", selector = "header, main > section, main > div, footer"] = process.argv.slice(2);
const port = 9400 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "measure-"));
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
await send("Emulation.setDeviceMetricsOverride", { width: +width, height: 812, deviceScaleFactor: 1, mobile: true }, sessionId);
await send("Emulation.setTouchEmulationEnabled", { enabled: true }, sessionId);
// Reveal animations leave transforms on the elements, which would inflate every box we read
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }, sessionId);
await send("Page.navigate", { url }, sessionId);
await sleep(3500);
const expression = `JSON.stringify({
  total: document.documentElement.scrollHeight,
  rows: [...document.querySelectorAll(${JSON.stringify(selector)})].map((el) => {
    const r = el.getBoundingClientRect();
    return { name: el.tagName.toLowerCase() + (el.className ? "." + String(el.className).trim().split(/\\s+/)[0] : ""),
             top: Math.round(r.top + scrollY), h: Math.round(r.height) };
  }),
})`;
const { result: { result } } = await send("Runtime.evaluate", { expression, returnByValue: true }, sessionId);
const out = JSON.parse(result.value);
console.log(`total ${out.total}`);
for (const r of out.rows) console.log(`  ${String(r.top).padStart(5)}  ${String(r.h).padStart(5)}  ${r.name}`);
finish(0);
