// Touch-device audit of the built pages: horizontal overflow, tap targets under 44, small text,
// inputs under 16px (iOS zoom) and how oversized each downloaded image is for its slot.
// Usage: node .qa/mobile-audit.mjs <widths comma-separated> [page ...]   (pages default to index)
// Pages are read over http (QA_BASE, default http://127.0.0.1:8123/) because asset URLs are root-relative.
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const widths = (process.argv[2] || "360,390,768,1024").split(",").map(Number);
const pages = process.argv.length > 3 ? process.argv.slice(3) : ["index"];
const base = process.env.QA_BASE || "http://127.0.0.1:8123/";

const port = 9400 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "maudit-"));
const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "about:blank"],
  { stdio: "ignore" }
);
const finish = (code) => {
  try { execSync(`taskkill /PID ${chrome.pid} /T /F`, { stdio: "ignore" }); } catch {}
  process.exit(code);
};
setTimeout(() => { console.error("timed out"); finish(1); }, 540000);
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
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }, sessionId);
await send("Emulation.setTouchEmulationEnabled", { enabled: true }, sessionId);

const probe = () => {
  const vw = innerWidth;
  const label = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
  const hidden = (el) => {
    if (el.closest(".offcanvas:not(.show), .icon-sprite, .visually-hidden, .visually-hidden-focusable")) return true;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.display === "none" || cs.visibility === "hidden" || r.width === 0 || r.height === 0;
  };
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (o.overflowX !== "visible") return true;
    }
    return false;
  };
  const overflowers = [];
  for (const el of document.querySelectorAll("body *")) {
    if (hidden(el) || inScroller(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) overflowers.push(`${label(el)} [${Math.round(r.left)} → ${Math.round(r.right)}]`);
  }
  const taps = [];
  for (const el of document.querySelectorAll("a[href], button, input, select, textarea, [role=tab], summary")) {
    if (hidden(el)) continue;
    const cs = getComputedStyle(el);
    const inlineInText = el.tagName === "A" && cs.display === "inline" && el.parentElement && el.parentElement.textContent.trim().length > el.textContent.trim().length + 12;
    if (inlineInText) continue;
    const r = el.getBoundingClientRect();
    // an absolutely positioned ::before with content is the invisible hit area from .tap-area()
    const hit = getComputedStyle(el, "::before");
    const grown = hit.content !== "none" && hit.position === "absolute" && hit.display !== "none" && hit.backgroundColor === "rgba(0, 0, 0, 0)";
    const w = grown ? Math.max(r.width, parseFloat(hit.width) || 0) : r.width;
    const h = grown ? Math.max(r.height, parseFloat(hit.height) || 0) : r.height;
    // data-tap-aa: a text-link list kept at the design's pitch, so its targets meet WCAG AA's 24 instead of 44
    const min = el.closest("[data-tap-aa]") ? 23.5 : 43.5;
    if (w < min || h < min) taps.push(`${label(el)} "${(el.getAttribute("aria-label") || el.textContent || el.placeholder || "").trim().slice(0, 28)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  const small = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim() || hidden(n.parentElement)) continue;
    if (!/[\p{L}\p{N}]/u.test(n.textContent)) continue; // a lone mark such as a raised ® is not reading text
    const fs = parseFloat(getComputedStyle(n.parentElement).fontSize);
    if (fs < 12) small.set(`${label(n.parentElement)} ${fs}px`, (small.get(`${label(n.parentElement)} ${fs}px`) || 0) + 1);
  }
  const inputs = [...document.querySelectorAll("input, textarea, select")].filter((el) => !hidden(el) && parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => `${label(el)} ${getComputedStyle(el).fontSize}`);
  const images = [...document.querySelectorAll("img")].filter((el) => !hidden(el)).map((el) => {
    const r = el.getBoundingClientRect();
    return { src: (el.currentSrc || el.src).split("/assets/")[1] || el.src, natural: el.naturalWidth, shown: Math.round(r.width), lazy: el.loading === "lazy", y: Math.round(r.top + scrollY) };
  });
  return JSON.stringify({ scrollWidth: document.documentElement.scrollWidth, vw, height: document.documentElement.scrollHeight, overflowers: overflowers.slice(0, 8), taps, small: [...small.entries()], inputs, images });
};

const uniq = (list) => [...new Set(list)];
for (const width of widths) {
  const dpr = width < 700 ? 3 : 2;
  await send("Emulation.setDeviceMetricsOverride", { width, height: width < 700 ? 800 : 1100, deviceScaleFactor: dpr, mobile: true }, sessionId);
  for (const page of pages) {
    await send("Page.navigate", { url: base + page + ".html" }, sessionId);
    await sleep(2200);
    const res = await send("Runtime.evaluate", { expression: `(${probe.toString()})()`, returnByValue: true }, sessionId);
    const d = JSON.parse(res.result.result.value);
    // second pass with the menu and every submenu open, so their targets are measured too
    await send("Runtime.evaluate", { expression: `document.querySelector("[data-menu-open]")?.click(); document.querySelectorAll(".menu__link[aria-expanded]").forEach((b) => b.click())` }, sessionId);
    await sleep(900);
    const resMenu = await send("Runtime.evaluate", { expression: `(${probe.toString()})()`, returnByValue: true }, sessionId);
    const m = JSON.parse(resMenu.result.result.value);
    d.taps.push(...m.taps.filter((t) => t.includes(".menu")));
    d.inputs.push(...m.inputs.filter((t) => t.includes(".menu")));
    d.small.push(...m.small.filter(([k]) => k.includes(".menu")));
    let bytes = 0, ideal = 0;
    const heavy = [];
    for (const im of d.images) {
      const file = path.join(dist, "assets", im.src);
      const size = fs.existsSync(file) ? fs.statSync(file).size : 0;
      bytes += size;
      const need = im.shown * dpr;
      const ratio = im.natural / Math.max(1, need);
      ideal += size / Math.max(1, ratio * ratio);
      if (ratio > 1.6 && size > 40000) heavy.push(`${im.src} ${im.natural}w for a ${im.shown}px slot (${Math.round(size / 1024)} KB, ${ratio.toFixed(1)}× too wide)`);
    }
    console.log(`\n### ${page} @ ${width}  (page ${d.height} tall, images ${Math.round(bytes / 1024)} KB)`);
    if (d.scrollWidth > d.vw + 1) console.log(`  OVERFLOW: document is ${d.scrollWidth} wide`);
    for (const o of d.overflowers) console.log(`  overflow  ${o}`);
    for (const t of uniq(d.taps)) console.log(`  tap<44    ${t}`);
    for (const [k, n] of d.small) console.log(`  small     ${k} ×${n}`);
    for (const i of uniq(d.inputs)) console.log(`  input<16  ${i}`);
    for (const h of uniq(heavy)) console.log(`  heavy     ${h}`);
  }
}
finish(0);
