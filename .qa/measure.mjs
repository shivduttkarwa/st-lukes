// Measure a built page at a given width: section boxes + the line-box position of every text run.
// Usage: node .qa/measure.mjs <url> <width> <out.json>
// Motion is switched off (prefers-reduced-motion) so everything is measured at rest.
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [url, width, out] = process.argv.slice(2);
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
// 1182 is the design's own artboard height, so vh-based rules resolve as drawn
await send("Emulation.setDeviceMetricsOverride", { width: +width, height: 1182, deviceScaleFactor: 1, mobile: false }, sessionId);
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }, sessionId);
await send("Page.navigate", { url }, sessionId);
await sleep(3500);

const probe = () => {
  const round = (n) => Math.round(n * 10) / 10;
  const sections = [...document.querySelectorAll("main > *, body > footer")].map((el) => {
    const r = el.getBoundingClientRect();
    return { name: (el.className || el.tagName).toString().split(" ")[0], top: round(r.top + scrollY), height: round(r.height) };
  });
  // visible box of every photo: the clipping parent when the image overflows it (parallax, cover crops)
  const images = [];
  for (const img of document.querySelectorAll("body > header img, main img, footer img")) {
    let box = img.getBoundingClientRect();
    for (let p = img.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (o.overflow !== "visible" || o.overflowX !== "visible") {
        const pr = p.getBoundingClientRect();
        const l = Math.max(box.left, pr.left), t = Math.max(box.top, pr.top);
        box = { left: l, top: t, width: Math.min(box.right ?? box.left + box.width, pr.right) - l, height: Math.min(box.bottom ?? box.top + box.height, pr.bottom) - t, right: Math.min(box.right ?? box.left + box.width, pr.right), bottom: Math.min(box.bottom ?? box.top + box.height, pr.bottom) };
      }
    }
    if (box.width > 0 && box.height > 0) images.push({ src: img.getAttribute("src").split("/").slice(-2).join("/"), left: round(box.left), top: round(box.top + scrollY), width: round(box.width), height: round(box.height) });
  }
  const texts = [];
  // placeholders are not text nodes: report them as the run that would sit in the control
  const ctx = document.createElement("canvas").getContext("2d");
  for (const el of document.querySelectorAll("input[placeholder], textarea[placeholder]")) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const left = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
    const top = r.top + scrollY + parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop);
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const ls = parseFloat(cs.letterSpacing) || 0;
    const width = ctx.measureText(el.placeholder).width + ls * el.placeholder.length;
    const ph = getComputedStyle(el, "::placeholder");
    texts.push({
      text: el.placeholder, tag: el.tagName.toLowerCase(), cls: "placeholder",
      left: round(left), right: round(left + width), top: round(top), bottom: round(top + parseFloat(cs.lineHeight)), lines: 1,
      fontSize: round(parseFloat(cs.fontSize)), lineHeight: round(parseFloat(cs.lineHeight)),
      family: cs.fontFamily.split(",")[0].replace(/"/g, ""), weight: cs.fontWeight, align: cs.textAlign, color: ph.color,
    });
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  for (let el = walker.currentNode; el; el = walker.nextNode()) {
    if (el.closest(".offcanvas, .icon-sprite, script, style, noscript, .visually-hidden, .visually-hidden-focusable")) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own.length) continue;
    const range = document.createRange();
    range.selectNodeContents(own[0]);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    if (!rects.length) continue;
    const cs = getComputedStyle(el);
    const fontSize = parseFloat(cs.fontSize);
    const lineHeight = cs.lineHeight === "normal" ? rects[0].height : parseFloat(cs.lineHeight);
    const allRects = [];
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let tn = tw.nextNode(); tn; tn = tw.nextNode()) {
      if (!tn.textContent.trim()) continue;
      const tr = document.createRange();
      tr.selectNodeContents(tn);
      allRects.push(...[...tr.getClientRects()].filter((r) => r.width > 0));
    }
    texts.push({
      text: el.textContent.replace(/\s+/g, " ").trim().slice(0, 90),
      tag: el.tagName.toLowerCase(),
      cls: (el.className || "").toString().split(" ")[0],
      left: round(Math.min(...allRects.map((r) => r.left))),
      right: round(Math.max(...allRects.map((r) => r.right))),
      top: round(rects[0].top + scrollY - (lineHeight - rects[0].height) / 2),
      bottom: round(Math.max(...allRects.map((r) => r.bottom)) + scrollY),
      lines: new Set(allRects.map((r) => Math.round(r.top))).size,
      fontSize: round(fontSize),
      lineHeight: round(lineHeight),
      family: cs.fontFamily.split(",")[0].replace(/"/g, ""),
      weight: cs.fontWeight,
      align: cs.textAlign,
      color: cs.color,
    });
  }
  return JSON.stringify({ width: innerWidth, height: document.documentElement.scrollHeight, sections, texts, images });
};
const { result } = await send("Runtime.evaluate", { expression: `(${probe.toString()})()`, returnByValue: true }, sessionId);
fs.writeFileSync(out, result.result.value);
const data = JSON.parse(result.result.value);
console.log(`measured ${out}: ${data.sections.length} sections, ${data.texts.length} text runs, page height ${data.height}`);
finish(0);
