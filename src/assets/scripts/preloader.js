import { gsap } from "gsap";
import { lockScroll } from "./ui.js";

// each title row's centre from the screen centre, in em of the title (Preloader Step 02: 648 and 845.5 of 1440 at 150)
const ROWS = [-0.48, 0.837];
const ENTER = { duration: 2.4, ease: "power2.out", stagger: 0.3 };
const RINGS_LEAD = 1.2;
const PLAYED = "preloader-played";

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

function play(root, loader, title, media) {
  const rows = Array.from(title.querySelectorAll(".hero__line"));
  const finish = () => {
    loader.remove();
    root.classList.remove("is-preloading");
  };
  return new Promise((resolve) => {
    try {
      window.scrollTo(0, 0);
      lockScroll(true);
      const { innerWidth: width, innerHeight: height } = window;
      const size = parseFloat(getComputedStyle(title).fontSize);
      const boxes = rows.map(textBox);
      const y = height / 2 - (boxes[0].top + boxes[1].bottom) / 2;
      const x = boxes.map((box, i) => width / 2 + ROWS[i] * size - (box.left + box.right) / 2);
      // the rings start growing at first paint (CSS); the rows follow them by RINGS_LEAD however late the script runs
      const ring = loader.querySelector("circle").getAnimations()[0];
      const delay = ring?.startTime == null ? RINGS_LEAD : Math.max(0, RINGS_LEAD - (document.timeline.currentTime - ring.startTime) / 1000);
      gsap.set(rows, { y, transition: "none" });
      gsap.set(title, { visibility: "visible" });
      gsap.fromTo(rows, { x: (i) => (i ? width - boxes[i].left : -boxes[i].right) }, { x: (i) => x[i], ...ENTER, delay });
      Promise.all([after(delay + 1.5), media]).then(() => {
        gsap.timeline({
          onComplete: () => {
            gsap.set([title, ...rows], { clearProps: "all" });
            lockScroll(false);
          },
        })
          .fromTo(loader, { "--preloader-hole": "0px" }, { "--preloader-hole": `${Math.hypot(width, height) / 2 + 2}px`, duration: 2.4, ease: "power2.inOut" })
          .to(loader.firstElementChild, { opacity: 0.58, duration: 1.2, ease: "power1.out" }, 0)
          .call(resolve, [], 2)
          .to(rows, { x: 0, y: 0, duration: 1.6, ease: "power2.inOut" }, 2)
          .call(finish, [], 2.4);
      });
    } catch (err) {
      console.error("[preloader]", err);
      finish();
      gsap.set([title, ...rows], { clearProps: "all" });
      lockScroll(false);
      resolve();
    }
  });
}

// Resolves as the circle opens, so Anim's hero entrance (its `after`) comes in with the title's move down
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
  try {
    sessionStorage.setItem(PLAYED, "1");
  } catch {}
  // the preloader moves the title itself, so Anim must leave it alone
  title.removeAttribute("data-anim");
  const media = briefly(mediaReady(hero), 4000);
  return briefly(document.fonts?.ready ?? Promise.resolve(), 1500).then(() => play(root, loader, title, media));
}
