import { gsap } from "gsap";
import { lockScroll } from "./ui.js";

// each title row's centre from the screen centre, in em of the title (Preloader Step 02: 648 and 845.5 of 1440 at 150)
const ROWS = [-0.48, 0.837];
const ENTER = { duration: 2.4, ease: "power2.out", stagger: 0.3 };
const RINGS_LEAD = 0.7;

const briefly = (promise, ms) => Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);
const after = (seconds) => new Promise((resolve) => gsap.delayedCall(seconds, resolve));

function mediaReady(hero) {
  const video = hero.querySelector(".hero__video");
  if (video) {
    return video.readyState >= 3 ? Promise.resolve() : new Promise((resolve) => video.addEventListener("canplay", resolve, { once: true }));
  }
  return hero.querySelector(".hero__img")?.decode().catch(() => {}) ?? Promise.resolve();
}

function textBox(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  return range.getBoundingClientRect();
}

function cssPx(value, parent) {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;width:${value}`;
  parent.append(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return px;
}

function play(root, loader, title, media) {
  const rows = Array.from(title.querySelectorAll(".hero__line"));
  let release = () => {};
  const finish = () => {
    loader.remove();
    root.classList.remove("is-preloading");
  };
  return new Promise((resolve) => {
    try {
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      root.style.scrollBehavior = "";
      lockScroll(true);
      const { innerWidth: width, innerHeight: height } = window;
      const size = parseFloat(getComputedStyle(title).fontSize);
      const boxes = rows.map(textBox);
      const edge = cssPx("var(--preloader-edge)", loader);
      const centred = boxes.map((box, i) => width / 2 + ROWS[i] * size - (box.left + box.right) / 2);
      const left = Math.min(...boxes.map((box, i) => box.left + centred[i]));
      const right = Math.max(...boxes.map((box, i) => box.right + centred[i]));
      // Figma's pair is nudged inside the edges, or where it is wider than the screen the rows sit flush left and right within them
      const x = right - left > width - 2 * edge
        ? [edge - boxes[0].left, width - edge - boxes[1].right]
        : centred.map((cx) => cx + Math.max(0, edge - left) - Math.max(0, right - (width - edge)));
      // the rings start growing at first paint (CSS); the rows follow them by RINGS_LEAD however late the script runs
      const ring = loader.querySelector("circle").getAnimations()[0];
      const delay = ring?.startTime == null ? RINGS_LEAD : Math.max(0, RINGS_LEAD - (document.timeline.currentTime - ring.startTime) / 1000);
      // a phone's toolbar or a late scroll can move the page under the rings, so the rows follow their centre until they leave
      const hold = () => {
        const screen = loader.getBoundingClientRect();
        const mid = (textBox(rows[0]).top + textBox(rows[1]).bottom) / 2 - gsap.getProperty(rows[0], "y");
        gsap.set(rows, { y: screen.top + screen.height / 2 - mid });
      };
      release = () => ["resize", "scroll"].forEach((type) => window.removeEventListener(type, hold));
      gsap.set(rows, { transition: "none" });
      hold();
      ["resize", "scroll"].forEach((type) => window.addEventListener(type, hold, { passive: true }));
      gsap.set(title, { visibility: "visible" });
      gsap.fromTo(rows, { x: (i) => (i ? width - boxes[i].left : -boxes[i].right) }, { x: (i) => x[i], ...ENTER, delay });
      Promise.all([after(delay + 1), media]).then(() => {
        gsap.timeline({
          onComplete: () => {
            gsap.set([title, ...rows], { clearProps: "all" });
            lockScroll(false);
          },
        })
          .fromTo(loader, { "--preloader-hole": "0px" }, { "--preloader-hole": `${Math.hypot(width, height) / 2 + 2}px`, duration: 2.4, ease: "power2.inOut" })
          .to(loader.firstElementChild, { opacity: 0.58, duration: 1.2, ease: "power1.out" }, 0)
          .call(release, [], 1.4)
          .to(rows, { x: 0, y: 0, duration: 1.6, ease: "power2.inOut" }, 1.4)
          .call(resolve, [], 2.7)
          .call(finish, [], 2.4);
      });
    } catch (err) {
      console.error("[preloader]", err);
      release();
      finish();
      gsap.set([title, ...rows], { clearProps: "all" });
      lockScroll(false);
      resolve();
    }
  });
}

// Resolves just before the title lands in the hero, so Anim's hero entrance (its `after`) follows it
export function initPreloader() {
  const root = document.documentElement;
  const loader = document.querySelector("[data-preloader]");
  const hero = document.querySelector(".hero");
  const title = hero?.querySelector("h1");
  if (!root.classList.contains("is-preloading") || !loader || !title) {
    root.classList.remove("is-preloading");
    loader?.remove();
    return null;
  }
  root.setAttribute("data-preloader-live", "");
  // the preloader moves the title itself, so Anim must leave it alone
  title.removeAttribute("data-anim");
  const media = briefly(mediaReady(hero), 4000);
  return briefly(document.fonts?.ready ?? Promise.resolve(), 1500).then(() => play(root, loader, title, media));
}
