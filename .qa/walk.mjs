// Scroll-and-capture every screen of each page at each size (WxH, m = mobile, r = reduced motion), then stitch the slices into sheets.
// Usage: node .qa/walk.mjs <outDir> <sizes e.g. 375x812mr,768x1024mr,1024x768mr> <cols> <page ...>   (pages over QA_BASE, default http://127.0.0.1:8123/)
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [outDir, configsArg, colsArg, ...pages] = process.argv.slice(2);
const configs = configsArg.split(",").map((c) => {
  const m = c.match(/^(\d+)x(\d+)([md])(r?)$/);
  return { w: +m[1], h: +m[2], mobile: m[3] === "m", reduced: m[4] === "r" };
});
const cols = +colsArg || 4;
const base = process.env.QA_BASE || "http://127.0.0.1:8123/";
fs.mkdirSync(outDir, { recursive: true });

const port = 9400 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "walk-"));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe",
  ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--autoplay-policy=no-user-gesture-required", "about:blank"], { stdio: "ignore" });
const finish = (code) => { try { execSync(`taskkill /PID ${chrome.pid} /T /F`, { stdio: "ignore" }); } catch {} try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch {} process.exit(code); };
setTimeout(() => { console.error("timed out"); finish(1); }, 580000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let version;
for (let i = 0; i < 60 && !version; i++) { try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(250); } }
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } };
const send = (method, params = {}, sessionId) => new Promise((resolve) => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params, sessionId })); });
const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
const evalJs = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }, sessionId)).result?.result?.value;

for (const c of configs) {
  await send("Emulation.setDeviceMetricsOverride", { width: c.w, height: c.h, deviceScaleFactor: 1, mobile: c.mobile }, sessionId);
  await send("Emulation.setTouchEmulationEnabled", { enabled: c.mobile }, sessionId);
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: c.reduced ? "reduce" : "no-preference" }] }, sessionId);
  for (const page of pages) {
    await send("Page.navigate", { url: base + page + ".html" }, sessionId);
    await sleep(c.reduced ? 2500 : 6000);
    const total = await evalJs("document.documentElement.scrollHeight");
    const tag = `${page}-${c.w}x${c.h}${c.mobile ? "m" : "d"}${c.reduced ? "r" : ""}`;
    const sliceDir = path.join(outDir, "slices", tag);
    fs.mkdirSync(sliceDir, { recursive: true });
    let n = 0;
    for (let y = 0; y < total; y += c.h) {
      await evalJs(`window.scrollTo({top:${y},left:0,behavior:'instant'}); true`);
      await sleep(c.reduced ? 350 : 1600);
      const { result: { data } } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, sessionId);
      fs.writeFileSync(path.join(sliceDir, `${String(n++).padStart(2, "0")}.png`), Buffer.from(data, "base64"));
    }
    const sw = await evalJs("document.documentElement.scrollWidth");
    console.log(`${tag}: ${n} slices, ${total}px tall, scrollWidth ${sw}`);
  }
}
ws.close();
try { execSync(`python "${process.argv[1].replace(/walk.mjs$/, "sheets.py")}" "${outDir}" ${cols}`, { stdio: "inherit" }); } catch (e) { console.error("sheets failed", e.message); }
finish(0);
