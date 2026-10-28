/**
 * anim — animation system
 * Window-native Lenis smooth scroll + GSAP ScrollTrigger reveal / split / sequence / parallax,
 * driven entirely by data-anim-* attributes. See references/anim-api.md.
 *
 * Tiers: "default" and "secondary" play when they scroll into view. "hero" is the page entrance:
 * every hero-tier element joins one timeline on load, stepping through data-anim-order (0 first);
 * elements that share an order start together and each step starts as the previous one lands
 * (data-anim-lead = seconds before the previous step ends; the default is DEFAULTS.entranceLead).
 * Scroll steps are tied to the scroll position but only ever move forwards (see SCRUB). A scroll step
 * already in view at load plays in time after the entrance instead, so a short hero never lets the
 * content below it beat the title. On phones a section's copy waits for its title as well.
 */
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

const DEFAULTS = {
  duration: 0.7,
  ease: "power1.out",
  stagger: 0.1,
  spread: 0.6, // the longest a batch of staggered reveals may run in total
  entranceLead: 0.4, // an entrance step starts this long before the previous one ends
  titleLead: 0.6, // the step after a hero title: its last letters read as landed this long before they stop fading, so no pause
  lenis: { duration: 1.2, smoothWheel: true, wheelMultiplier: 0.8, touchMultiplier: 1.5 },
};

// Scroll reveals follow the scroll forwards only: they run from their start line over this share of the
// viewport, trailing the scroll by `smooth` seconds, and stay revealed once they reach the end.
const SCRUB = { distance: 0.28, smooth: 0.4 };

// `swing-in` (the Mina Wylie photo) swings down from the top right: start as % of its own width / height, and the turn in degrees
const SWING = { x: 20, y: -25, rotation: 18, ease: "power3.out" };

// Copy is drawn on whole pixels, so a lift eased as slowly as the fade arrives as separate 1px hops after the copy looks
// still, and stacked paragraphs take them at different moments. The lift therefore lands early, under the fade, and
// moves in whole pixels so every line steps on the same frame
const LIFT = 15;
const whole = (ease, distance) => {
  const curve = gsap.parseEase(ease);
  return (progress) => Math.round(curve(progress) * distance) / distance;
};

// Every preset fades (autoAlpha) so the CSS FOUC guard works uniformly.
const REVEAL = {
  "fade-up":    { from: { y: LIFT, autoAlpha: 0 },              to: { autoAlpha: 1, keyframes: { "57%": { y: 0, ease: whole("power1.out", LIFT) }, ease: "none" } } },
  "fade":       { from: { autoAlpha: 0 },                       to: { autoAlpha: 1 } },
  "fade-soft":  { from: { autoAlpha: 0 },                       to: { autoAlpha: 1, duration: 0.5, ease: "power1.out" } }, // header items
  "rise-soft":  { from: { y: 14, autoAlpha: 0 },                to: { y: 0, autoAlpha: 1, duration: 0.55, ease: "power2.out" } }, // the quick links below lg
  "from-left":  { from: { x: "-15%", autoAlpha: 0 },            to: { x: "0%", autoAlpha: 1 } },
  "from-right": { from: { x: "15%", autoAlpha: 0 },             to: { x: "0%", autoAlpha: 1 } },
  "enter-right": { from: { x: "110%", autoAlpha: 0 },           to: { x: "0%", autoAlpha: 1, duration: 0.9, ease: "expo.out" } },
  "nudge-right": { from: { x: 40, autoAlpha: 0 },               to: { x: 0, autoAlpha: 1 } },
  "swing-in":   { from: { xPercent: SWING.x, yPercent: SWING.y, rotation: SWING.rotation, autoAlpha: 0 }, to: { xPercent: 0, yPercent: 0, rotation: 0, autoAlpha: 1, duration: 1.2, ease: SWING.ease } },
  "drop":       { from: { y: -48, autoAlpha: 0 },               to: { y: 0, autoAlpha: 1, duration: 0.6, ease: "back.out(1.4)" } },
  "pop":        { from: { autoAlpha: 0 },                       to: { autoAlpha: 1, duration: 0.6, ease: "power2.out" } },
  // a crisp wipe from the bottom edge up, no fade: visibility flips as the tween starts
  "wipe-up":    { from: { clipPath: "inset(100% 0% 0% 0%)", visibility: "hidden" }, to: { clipPath: "inset(0% 0% 0% 0%)", visibility: "inherit", duration: 1.1, ease: "power3.out" } },
  "scale":      { from: { scale: 1.12, autoAlpha: 0 },          to: { scale: 1, autoAlpha: 1, duration: 1.1, ease: "power4.out" } },
  "scale-x":    { from: { scaleX: 0, autoAlpha: 0 },            to: { scaleX: 1, autoAlpha: 1, duration: 1.2, ease: "power4.inOut" } },
  "scale-y":    { from: { scaleY: 0, autoAlpha: 0 },            to: { scaleY: 1, autoAlpha: 1, duration: 1.2, ease: "power4.inOut" } },
  "clip":       { from: { "--anim-clip": "100%", autoAlpha: 0 }, to: { "--anim-clip": "0%", autoAlpha: 1, duration: 1.1, ease: "power3.out" } },
};

// Split text: characters slide up one after another; lines rise and fade in, 0.15s apart, with no mask (the reference
// site's section titles, ref/wcc .split-text-lines-js: the rise over 0.6s, the fade over 0.5s from 0.1s in, both
// power1.out; the reference rises 30, here the lines rise the 15 of every fade-up so a title moves like the copy under it). `spread` caps how long a stagger may run in total, so a long title tightens its stagger instead of dragging on.
// `rise` is the distance in em of the element's font size, so a phone title rises less than the
// 1640 one (0.12em: 16 at the 131.6 hero, 7 at the 60 phone hero; 0.2em: 7 at the 35 section h2).
// `lift` ends the rise early: eased as slowly as the fade, its last pixels land as separate hops after the letter looks still.
const SPLIT = {
  "chars":      { from: { autoAlpha: 0 }, rise: 0.12, to: { y: 0, autoAlpha: 1, duration: 0.85, ease: "power2.out", stagger: 0.022 }, lift: { duration: 0.4, ease: "power1.out" }, spread: 0.56 }, // hero titles
  "chars-soft": { from: { autoAlpha: 0 }, rise: 0.2, to: { y: 0, autoAlpha: 1, duration: 0.62, ease: "power2.out", stagger: 0.015 }, lift: { duration: 0.3, ease: "power1.out" }, spread: 0.375 }, // section titles
  "lines":      { from: { y: 15, autoAlpha: 0 }, to: { y: 0, duration: 0.6, ease: "power1.out", stagger: 0.15 }, fade: { autoAlpha: 1, duration: 0.5, ease: "power1.out", delay: 0.1 } }, // section titles below lg
};

// Scroll tiers start once the element's top is this far up the viewport; data-anim-start overrides it
// (ScrollTrigger syntax, e.g. "top 45%" for a tall block whose pieces sit low).
const TIER_START = {
  default: "top 85%",
  secondary: "top 90%",
};
const HERO = "hero";

const BOUND = "data-anim-bound"; // marks an element as already initialised
const AUTO_ORDER = "data-anim-auto-order"; // the order came from a group, not from the markup

const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const attr = (el, name, fallback = null) =>
  el.hasAttribute(name) ? el.getAttribute(name) : fallback;

const number = (el, name, fallback) => {
  const value = parseFloat(attr(el, name, ""));
  return Number.isNaN(value) ? fallback : value;
};

const tierOf = (el) => attr(el, "data-anim-tier", "default");
const startOf = (el) => attr(el, "data-anim-start", TIER_START[tierOf(el)] || TIER_START.default);
// below lg; asked as a media query because reading window.innerWidth forces a layout every time
const phone = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(max-width: 991.98px)") : { matches: false };
// data-anim-order-mobile reorders an entrance step where the phone layout stacks things differently
const orderOf = (el, fallback = 0) =>
  phone.matches && el.hasAttribute("data-anim-order-mobile")
    ? number(el, "data-anim-order-mobile", fallback)
    : number(el, "data-anim-order", fallback);
// A `-mobile` twin wins below 992: a scrubbed step's start, end or scrub, a step's type or lead, a sequence's stagger
const variant = (el, name) =>
  phone.matches && el.hasAttribute(`${name}-mobile`) ? `${name}-mobile` : name;
// null where the markup names no lead: the entrance timeline then picks its own (see playEntrance)
const leadOf = (el) => {
  const name = variant(el, "data-anim-lead");
  return el.hasAttribute(name) ? number(el, name, DEFAULTS.entranceLead) : null;
};
const presetOf = (el) => REVEAL[attr(el, variant(el, "data-anim-type"), "fade-up")] || REVEAL["fade-up"];

// data-anim-duration / data-anim-delay let a step be timed against its neighbours
const toVars = (preset, el) => ({
  ...preset.to,
  duration: (el && number(el, "data-anim-duration", 0)) || preset.to.duration || DEFAULTS.duration,
  delay: (el && number(el, "data-anim-delay", 0)) || 0,
  ease: preset.to.ease || DEFAULTS.ease,
});

// Collect matching elements under `root` (incl. root itself) that aren't bound yet.
function scoped(root, selector) {
  const list = Array.from(root.querySelectorAll(selector));
  if (root.matches && root.matches(selector)) list.unshift(root);
  // a hidden element (a closed tab pane) is left for Anim.add() once it is shown
  return list.filter((el) => !el.hasAttribute(BOUND) && el.getClientRects().length);
}
const bind = (el) => el.setAttribute(BOUND, "");

let lenis = null;
let started = false;
let immediate = false; // add(root, { immediate }) treats every step as an entrance step
let handoff = 0; // ticker time from which scroll steps already in view may play: the page entrance's last step
const follow = () => Math.max(0, handoff - gsap.ticker.time);

// On phones a section's copy follows its title: the nearest split before it in the same `main > *` block.
// An ancestor with data-anim-titles-first="off" switches that off (the home page, choreographed per block).
const titleDurations = new WeakMap(); // split -> how long its animation runs
const titlesFirst = (el) => phone.matches && !el.closest('[data-anim-titles-first="off"]');
function titleFor(el) {
  const section = el.closest("main > *");
  if (!section) return null;
  const titles = Array.from(section.querySelectorAll('[data-anim="split"]')).filter(
    (title) => title !== el && tierOf(title) !== HERO && (title.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)
  );
  return titles[titles.length - 1] || null;
}
// How long `el` holds back for the title before it: all of the title's run when they start together,
// less the further down the page the copy sits
function titleHold(el) {
  if (!titlesFirst(el)) return 0;
  const title = titleFor(el);
  if (!title) return 0;
  const run = titleDurations.get(title) || 0;
  const onScreen = (node) => node.getBoundingClientRect().top < window.innerHeight;
  if (onScreen(el) && onScreen(title)) return run; // both on screen at load: they start together
  const gap = el.getBoundingClientRect().top - title.getBoundingClientRect().top;
  const share = 1 - gap / (window.innerHeight * SCRUB.distance);
  return run * gsap.utils.clamp(0, 1, share);
}
const triggers = new WeakMap(); // element -> its ScrollTrigger
const splits = new WeakMap(); // element -> its SplitText while split
const entrances = new WeakMap(); // root -> its entrance timeline

function initScroll(opts) {
  lenis = new Lenis({ ...DEFAULTS.lenis, ...(opts.lenis || {}) });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

// A step is { animation } — a factory that creates and starts its tween or timeline — plus
// { deferred: true, duration } when it can only be built at play time (text splits need the final font).

// A scroll step's animation sits `hold` seconds into a paused timeline whose progress follows the
// scroll and never goes back. It is built on first use, since a split needs the final layout. One
// already on screen when created plays in time after the entrance, even below its start line (the
// copy under a short hero), as does one whose range the page is too short to scroll through. data-anim-scroll="timed" keeps a step on the clock
// (the staggered slider wipes, which scrubbing makes feel rushed).
function scrollStep(el, animation, hold) {
  let tl = null;
  let reached = 0;
  const timeline = () => (tl ||= gsap.timeline({ paused: true }).add(animation(), hold));
  const onScreen = () => el.getBoundingClientRect().top < window.innerHeight;
  const playNow = (st) => {
    st.kill();
    triggers.delete(el);
    gsap.delayedCall(follow(), () => timeline().play());
  };
  if (attr(el, "data-anim-scroll") === "timed") {
    const st = ScrollTrigger.create({ trigger: el, start: startOf(el), once: true, onEnter: playNow });
    triggers.set(el, st);
    if (onScreen()) playNow(st);
    return;
  }
  const range = () => window.innerHeight * SCRUB.distance;
  const st = ScrollTrigger.create({
    trigger: el,
    start: `clamp(${startOf(el)})`,
    end: "max", // the range runs from the clamped start; a relative end would cut it short for a step already on screen
    onUpdate: (self) => {
      const reach = Math.min(self.start + range(), ScrollTrigger.maxScroll(window));
      if (reach - self.start < range() / 2) return playNow(self);
      const progress = gsap.utils.clamp(0, 1, (self.scroll() - self.start) / (reach - self.start));
      if (progress <= reached) return;
      reached = progress;
      if (progress === 1) {
        self.kill();
        triggers.delete(el);
      }
      if (progress > timeline().progress()) gsap.to(tl, { progress, duration: SCRUB.smooth, ease: "power2.out", overwrite: true });
    },
  });
  triggers.set(el, st);
  if (!(st.scroll() >= st.start || onScreen())) return;
  const wait = follow();
  if (!wait) return playNow(st);
  // On screen while the entrance still runs: it plays when that ends. The trigger stays alive throughout, so a
  // reader who scrolls down straight away or just after sees it follow the scroll like any other step, not a blank section.
  gsap.delayedCall(wait, () => {
    if (triggers.get(el) === st) timeline().play();
  });
}

// Hero-tier steps join the entrance timeline; the rest follow the scroll. Their triggers are created
// after the entrance is built, so one already in view can follow it instead of racing it.
function play(el, step, entrance, scroll, hold = orderOf(el) * DEFAULTS.stagger) {
  if (tierOf(el) === HERO || immediate) {
    entrance.push({ order: orderOf(el), lead: leadOf(el), ...step });
    return;
  }
  const create = () => scrollStep(el, step.animation, hold + titleHold(el));
  // a title already on screen is split with the entrance's own, before anything moves
  if (step.prepare && el.getBoundingClientRect().top < window.innerHeight) create.prepare = step.prepare;
  scroll.push(create);
}

function playEntrance(steps, root) {
  if (!steps.length) return;
  const tl = gsap.timeline();
  entrances.set(root, tl);
  let titleEnd = 0; // when the last hero title has finished splitting
  [...new Set(steps.map((step) => step.order))]
    .sort((a, b) => a - b)
    .forEach((order, i, orders) => {
      const group = steps.filter((step) => step.order === order);
      // whatever follows a hero title starts as the title finishes, on every page; a lead in the markup still wins
      const afterTitle = i > 0 && steps.some((step) => step.order === orders[i - 1] && step.deferred);
      const usual = afterTitle ? DEFAULTS.titleLead : DEFAULTS.entranceLead;
      const lead = Math.max(...group.map((step) => step.lead ?? usual));
      const at = i ? Math.max(0, tl.duration() - lead) : 0;
      group.forEach((step) => {
        if (!step.deferred) {
          tl.add(step.animation(), at);
          return;
        }
        tl.call(() => step.animation(), [], at);
        tl.to({}, { duration: step.duration }, at); // holds the slot so the next step waits for it
        titleEnd = Math.max(titleEnd, at + step.duration);
      });
    });
  // scroll steps already in view follow as the last step, but never while a title is still rising;
  // on phones they wait for the whole entrance, so the copy under a hero comes after its quick links
  const lead = phone.matches ? 0 : DEFAULTS.entranceLead;
  if (root !== document) return;
  handoff = gsap.ticker.time + Math.max(0, tl.duration() - lead, titleEnd);
  hurryOnScroll(tl, lead);
}

// The reader's first scroll during the entrance starts every step still to come at once, in order, so the hero is
// never beaten by the copy scrolling in under it
function hurryOnScroll(tl, lead) {
  const hurry = () => {
    if (window.scrollY < 2) return;
    window.removeEventListener("scroll", hurry);
    const now = tl.time();
    const waiting = tl.getChildren(false, true, true).filter((child) => child.startTime() > now);
    const starts = [...new Set(waiting.map((child) => child.startTime()))].sort((a, b) => a - b);
    waiting.forEach((child) => child.startTime(now + 0.001 + starts.indexOf(child.startTime()) * DEFAULTS.stagger));
    handoff = gsap.ticker.time + Math.max(0, tl.duration() - now - lead);
  };
  tl.eventCallback("onComplete", () => window.removeEventListener("scroll", hurry));
  window.addEventListener("scroll", hurry, { passive: true });
  hurry();
}

// data-anim-group -> tag direct children as staggered reveals (auto ordering)
const groupItems = new WeakMap(); // a group's item -> all of that group's items

function expandGroups(root) {
  scoped(root, "[data-anim-group]").forEach((group) => {
    const type = group.getAttribute("data-anim-group") || "fade-up";
    // a display: contents child has no box to animate, so its children are the items (the mosaic's slides from lg)
    const items = Array.from(group.children).flatMap((child) =>
      getComputedStyle(child).display === "contents" ? Array.from(child.children) : [child]
    );
    items.forEach((child, i) => {
      if (child.hasAttribute("data-anim") || child.hasAttribute("data-anim-item")) return; // an item belongs to its sequence
      child.setAttribute("data-anim", "reveal");
      child.setAttribute("data-anim-type", type);
      groupItems.set(child, items);
      if (!child.hasAttribute("data-anim-order")) {
        child.setAttribute("data-anim-order", String(i));
        child.setAttribute(AUTO_ORDER, "");
      }
    });
    bind(group);
  });
}

const revealStep = (el) => ({
  animation: () => gsap.to(el, { ...toVars(presetOf(el), el), onComplete: () => el.classList.add("is-revealed") }),
});

// A group's auto order is only a stagger index, so it restarts on each row; a hand-written one stays absolute.
function staggerHold(el) {
  if (!el.hasAttribute(AUTO_ORDER)) return orderOf(el) * DEFAULTS.stagger;
  const row = (groupItems.get(el) || Array.from(el.parentElement.children)).filter(
    (item) => item.hasAttribute(AUTO_ORDER) && Math.abs(item.offsetTop - el.offsetTop) < 2
  );
  const last = row.length - 1;
  return last ? row.indexOf(el) * Math.min(DEFAULTS.stagger, DEFAULTS.spread / last) : 0;
}

function setupReveals(root, entrance, scroll) {
  scoped(root, '[data-anim="reveal"]').forEach((el) => {
    // data-anim-media: the reveal only runs where this query matches at load; elsewhere the element simply shows
    const media = attr(el, "data-anim-media");
    if (media && !window.matchMedia(media).matches) {
      el.removeAttribute("data-anim");
      return;
    }
    bind(el);
    const preset = presetOf(el);
    gsap.set(el, preset.from);

    // data-anim-scrub hands the reveal to the scroll position. The trigger is an untransformed
    // ancestor, because the preset's start state has already moved the element's own box.
    if (el.hasAttribute("data-anim-scrub")) {
      const { delay, ...vars } = toVars(preset, el);
      const tween = gsap.to(el, {
        ...vars,
        scrollTrigger: {
          trigger: el.closest("[data-anim-trigger]") || el.parentElement || el,
          start: attr(el, variant(el, "data-anim-start"), "top 85%"),
          end: attr(el, variant(el, "data-anim-end"), "top 35%"),
          scrub: number(el, variant(el, "data-anim-scrub"), 1),
        },
      });
      if (tween.scrollTrigger) triggers.set(el, tween.scrollTrigger);
      return;
    }

    play(el, revealStep(el), entrance, scroll, staggerHold(el));
  });
}

// Box of every non-blank glyph while the text is still one kerned run.
function glyphBoxes(el) {
  const boxes = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent;
    for (let i = 0; i < text.length; i++) {
      if (/\s/.test(text[i])) continue;
      const range = document.createRange();
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      boxes.push(range.getBoundingClientRect());
    }
  }
  return boxes;
}

// Boxed words run a little wider than the kerned text, so a full line would wrap its last word while split.
// The split keeps the original line breaks instead: no wrapping, and a <br> wherever a line used to start.
// Both read every box first and write afterwards: a read after each write is a full layout per word or letter,
// which on a phone froze the page for several frames whenever a title was split while another was still moving.
function keepLines(el, split, boxes) {
  const index = new Map(split.chars.map((char, i) => [char, i]));
  el.style.whiteSpace = "nowrap";
  const words = split.words
    .map((word) => ({ word, first: index.get(word.querySelector(".anim-char")) }))
    .filter((item) => item.first !== undefined);
  const tops = words.map((item) => item.word.getBoundingClientRect().top);
  words.forEach((item, i) => {
    const prev = words[i - 1];
    if (prev && boxes[item.first].top > boxes[prev.first].top + 1 && tops[i] <= tops[i - 1] + 1) {
      const br = document.createElement("br");
      br.style.display = "inline"; // a heading may hide its own designed <br> at this width; this one must still break
      item.word.before(br);
    }
  });
}

// Boxing each character loses the kerning between pairs; nudge every box back to where its glyph sat.
// A margin moves its letter and the rest of the line, so each letter takes only what the one before it left over.
function keepKerning(chars, boxes) {
  const now = chars.map((char) => char.getBoundingClientRect());
  let line = null;
  let carried = 0;
  chars.forEach((char, i) => {
    if (line === null || Math.abs(now[i].top - line) > 1) {
      line = now[i].top;
      carried = 0;
    }
    const owed = boxes[i].left - now[i].left;
    const nudge = owed - carried;
    carried = owed;
    if (Math.abs(nudge) > 0.01) char.style.marginLeft = `${nudge}px`;
  });
}

function setupSplits(root, entrance, scroll) {
  scoped(root, '[data-anim="split"]').forEach((el) => {
    bind(el);
    const type = attr(el, variant(el, "data-anim-type"), "lines"); // data-anim-type-mobile: the phone titles rise as lines
    const preset = SPLIT[type] || SPLIT.lines;
    const isChars = preset !== SPLIT.lines;
    const count = isChars
      ? el.textContent.replace(/\s/g, "").length
      : Math.max(1, Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) || 1);
    const step = preset.spread ? Math.min(preset.to.stagger, preset.spread / Math.max(1, count)) : preset.to.stagger;
    titleDurations.set(el, preset.to.duration + step * Math.max(0, count - 1));
    const build = () => {
      const half = parseFloat(getComputedStyle(el).lineHeight) / 2 || parseFloat(getComputedStyle(el).fontSize) / 2;
      const boxes = glyphBoxes(el);
      // every title is boxed by word and letter with its lines held where they sat; a phone title then rises line by line
      // as its words, since SplitText's own lines can disagree with the layout (an <em> across a wrap, a <br> the width hides)
      const split = new SplitText(el, { type: "words,chars", wordsClass: "anim-word", charsClass: "anim-char" });
      const kept = boxes.length === split.chars.length;
      if (kept) {
        keepLines(el, split, boxes);
        keepKerning(split.chars, boxes);
      }
      let targets = split.chars;
      let stagger = step;
      if (!isChars) {
        const index = new Map(split.chars.map((char, i) => [char, i]));
        const tops = split.words.map((word) => {
          const first = index.get(word.querySelector(".anim-char"));
          return kept && first !== undefined ? boxes[first].top : word.getBoundingClientRect().top;
        });
        let line = -1;
        let top = -Infinity;
        const lineOf = tops.map((t) => {
          if (t > top + half) { // an italic run sits a pixel low on the same line
            line += 1;
            top = t;
          }
          return line;
        });
        targets = split.words;
        stagger = (i) => lineOf[i] * step;
      }
      splits.set(el, split);
      const from = preset.rise ? { ...preset.from, y: parseFloat(getComputedStyle(el).fontSize) * preset.rise } : preset.from;
      // read every transform first: gsap.set would read each letter back after writing the one before, a layout apiece
      targets.forEach((target) => gsap.getProperty(target, "y"));
      gsap.set(targets, from);
      return { split, targets, stagger };
    };
    let built = null;
    play(el, {
      deferred: true,
      duration: titleDurations.get(el),
      prepare: () => { built = build(); },
      animation: () => {
        const { split, targets, stagger } = built || build();
        built = null;
        gsap.set(el, { autoAlpha: 1 }); // the container shows; its pieces carry the hidden state
        // the original markup comes back once it has played, so the audited layout is untouched
        const onComplete = () => {
          el.classList.add("is-revealed");
          split.revert();
          el.style.whiteSpace = "";
          splits.delete(el);
        };
        if (preset.fade) {
          const { delay, ...fade } = preset.fade;
          return gsap.timeline()
            .to(targets, { ...preset.to, stagger, onComplete }, 0)
            .to(targets, { ...fade, stagger }, delay);
        }
        if (!preset.lift) return gsap.to(targets, { ...preset.to, stagger, onComplete });
        const { y, ...fade } = preset.to;
        return gsap.timeline()
          .to(targets, { ...fade, stagger, onComplete }, 0)
          .to(targets, { y, ...preset.lift, stagger }, 0);
      },
    }, entrance, scroll);
  });
}

// data-anim="sequence": one timeline over the marked descendants, staggered in DOM order. An item
// inherits the container's data-anim-type unless data-anim-item names a preset of its own.
// Items are cleared on completion so their own hover transitions keep working afterwards.
function setupSequences(root, entrance, scroll) {
  scoped(root, '[data-anim="sequence"]').forEach((el) => {
    bind(el);
    if (attr(el, "data-anim-arrival") === "static" && document.documentElement.classList.contains("page-arrival")) {
      el.classList.add("is-revealed");
      return;
    }
    // data-anim-items="children" makes the direct children the items (rich text: the CMS cannot mark each <p>)
    if (attr(el, "data-anim-items") === "children") Array.from(el.children).forEach((child) => child.setAttribute("data-anim-item", ""));
    // an item belongs to its nearest sequence, so sequences can nest (the accordion rows around the hotspots)
    const items = Array.from(el.querySelectorAll("[data-anim-item]")).filter(
      (item) => item.closest('[data-anim="sequence"]') === el && item.getClientRects().length
    );
    const mobile = phone.matches;
    if (!items.length || (mobile && el.hasAttribute("data-anim-disable-mobile"))) {
      el.classList.add("is-revealed");
      return;
    }
    // data-anim-mobile="each": where the items stack, each one reveals on its own as it scrolls in
    if (mobile && attr(el, "data-anim-mobile") === "each") {
      el.classList.add("is-revealed");
      items.forEach((item) => {
        item.setAttribute("data-anim", "reveal");
        item.setAttribute("data-anim-type", item.getAttribute("data-anim-item") || attr(el, variant(el, "data-anim-type"), "fade-up"));
      });
      return;
    }
    const presetFor = (item) => REVEAL[item.getAttribute("data-anim-item")] || presetOf(el);
    const stagger = number(el, variant(el, "data-anim-stagger"), null) ?? DEFAULTS.stagger; // an explicit 0 plays the items together
    // a CSS transition on an item would smear every frame of the tween, so it is paused until the end
    items.forEach((item) => gsap.set(item, { ...presetFor(item).from, transition: "none" }));
    play(el, {
      animation: () => {
        const tl = gsap.timeline({
          delay: number(el, "data-anim-delay", 0),
          onComplete: () => {
            el.classList.add("is-revealed");
            gsap.set(items, { clearProps: "all" });
          },
        });
        items.forEach((item, i) => tl.to(item, toVars(presetFor(item), item), i * stagger));
        return tl;
      },
    }, entrance, scroll);
  });
}

function setupParallax(root) {
  scoped(root, '[data-anim="parallax"]').forEach((el) => {
    bind(el);
    // the stylesheet runs it as a scroll-driven animation where the browser has them (06-animation/_parallax.less)
    if (getComputedStyle(el).animationName.split(",").some((name) => name.trim() === "parallax-y")) return;
    if (el.hasAttribute("data-anim-disable-mobile") && phone.matches) return;
    const axis = attr(el, "data-anim-axis", "y");
    const speed = number(el, variant(el, "data-anim-speed"), 0);
    const reverse = el.hasAttribute("data-anim-reverse");
    const scaleAttr = attr(el, "data-anim-scale", null);
    const scrubAttr = attr(el, variant(el, "data-anim-scrub"), null);
    const trigger = el.closest("[data-anim-parallax-trigger]") || el;
    const dir = reverse ? -1 : 1;
    const prop = axis === "x" ? "xPercent" : "yPercent";

    // data-anim-centered travels from -speed to +speed, so the layer sits at rest mid-way through the pass
    const from = { [prop]: el.hasAttribute("data-anim-centered") ? -speed * dir : 0 };
    const vars = { ease: "none", force3D: true, [prop]: speed * dir };
    if (scaleAttr) vars.scale = parseFloat(scaleAttr);

    gsap.fromTo(el, from, {
      ...vars,
      scrollTrigger: {
        trigger,
        start: attr(el, "data-anim-start", "top bottom"),
        end: attr(el, "data-anim-end", "bottom top"),
        scrub: scrubAttr === null ? 1 : scrubAttr === "" ? true : parseFloat(scrubAttr),
      },
    });
  });
}

// data-anim="progress" — scrubs --anim-progress from 0 to 1 as the block passes, for CSS to hang a
// growing line or any other scroll-linked state on.
function setupProgress(root) {
  scoped(root, '[data-anim="progress"]').forEach((el) => {
    bind(el);
    gsap.fromTo(
      el,
      { "--anim-progress": 0 },
      {
        "--anim-progress": 1,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: attr(el, variant(el, "data-anim-start"), "top 75%"),
          end: attr(el, variant(el, "data-anim-end"), "bottom 70%"),
          scrub: number(el, variant(el, "data-anim-scrub"), 0.5),
        },
      }
    );
  });
}

// Binds, start states and entrance splits; the returned function plays them
function prepareAll(root, opts = {}) {
  const entrance = [];
  const scroll = [];
  immediate = !!opts.immediate;
  try {
    expandGroups(root);
    setupSequences(root, entrance, scroll); // first: on a phone it may hand its items to setupReveals
    setupSplits(root, entrance, scroll); // before the reveals, so a title's trigger fires ahead of its copy's
    setupReveals(root, entrance, scroll);
    setupParallax(root);
    setupProgress(root);
  } finally {
    immediate = false;
  }
  entrance.forEach((step) => step.prepare?.());
  scroll.forEach((create) => create.prepare?.());
  return () => {
    playEntrance(entrance, root);
    scroll.forEach((create) => create());
  };
}

function setupAll(root, opts = {}) {
  prepareAll(root, opts)();
}

// Put every bound target under `root` back to its hidden start, so add() can play it again.
function resetAll(root) {
  entrances.get(root)?.kill();
  entrances.delete(root);
  const bound = Array.from(root.querySelectorAll(`[${BOUND}]`));
  if (root.hasAttribute && root.hasAttribute(BOUND)) bound.unshift(root);
  bound.forEach((el) => {
    triggers.get(el)?.kill();
    triggers.delete(el);
    const pieces = Array.from(el.querySelectorAll("[data-anim-item], .anim-char"));
    gsap.killTweensOf([el, ...pieces]);
    splits.get(el)?.revert();
    splits.delete(el);
    el.style.whiteSpace = "";
    gsap.set([el, ...pieces], { clearProps: "all" });
    el.removeAttribute(BOUND);
    el.classList.remove("is-revealed");
  });
}

function revealEverything() {
  gsap.utils
    .toArray('[data-anim="reveal"], [data-anim="split"], [data-anim="sequence"] [data-anim-item]')
    .forEach((el) => gsap.set(el, { clearProps: "all" }));
  document.documentElement.classList.add("anim-reduced");
}

const Anim = {
  lenis: null,

  init(opts = {}) {
    if (started) return this;
    started = true;
    document.documentElement.classList.add("anim-ready");
    document.documentElement.setAttribute("data-anim-live", "");

    if (reduced()) {
      document.documentElement.classList.add("anim-reduced");
      return this;
    }
    let run = null;
    const fail = (err) => {
      run = null;
      console.error("[anim] init failed — revealing content", err);
      revealEverything();
    };
    const prepare = () => {
      try {
        run = prepareAll(document);
        ScrollTrigger.refresh();
      } catch (err) {
        fail(err);
      }
    };
    const start = () => {
      try {
        run?.();
      } catch (err) {
        fail(err);
      }
    };
    try {
      initScroll(opts);
      this.lenis = lenis;
      window.addEventListener("load", () => ScrollTrigger.refresh());
    } catch (err) {
      console.error("[anim] init failed — revealing content", err);
      revealEverything();
      return this;
    }
    // A split measured against the fallback face would nudge its glyphs to the wrong places, so the
    // entrance waits for the webfonts (briefly: a font that never arrives must not hold the page), and
    // after a page transition for the slide to land (opts.after, capped so a stuck one cannot hold it).
    // Setup and splits happen during the slide; play waits two frames past it for the browser's repaint.
    const briefly = (promise, ms) => Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const settle = () => nextFrame().then(nextFrame);
    const fonts = document.fonts?.ready ?? Promise.resolve();
    briefly(fonts, 800)
      .then(nextFrame, nextFrame) // pagereveal has fired by the first frame, so a page arrival is known
      .then(prepare, prepare)
      .then(() => briefly(Promise.resolve(opts.after), 2000))
      .then(settle, settle)
      .then(start, start);
    return this;
  },

  // Initialise animations on content added AFTER init (e.g. load-more / AJAX, a tab pane).
  // Pass the inserted container (or a selector). Already-bound elements are skipped.
  // { immediate: true } plays every step at once as an entrance instead of waiting for scroll.
  add(container = document, opts = {}) {
    if (reduced()) return this;
    const root =
      typeof container === "string" ? document.querySelector(container) : container;
    if (!root) return this;
    try {
      setupAll(root, opts);
      ScrollTrigger.refresh();
    } catch (err) {
      console.error("[anim] add() failed", err);
    }
    return this;
  },

  // Return a container's targets to their hidden start so add() can replay them (a tab pane re-shown).
  reset(container = document) {
    if (reduced()) return this;
    const root =
      typeof container === "string" ? document.querySelector(container) : container;
    if (!root) return this;
    try {
      resetAll(root);
    } catch (err) {
      console.error("[anim] reset() failed", err);
    }
    return this;
  },

  refresh() { ScrollTrigger.refresh(); return this; },
  stop() { lenis && lenis.stop(); return this; },
  start() { lenis && lenis.start(); return this; },
};

if (typeof window !== "undefined") window.Anim = Anim;

export { Anim };
export default Anim;
