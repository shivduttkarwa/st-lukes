import Swiper from "swiper";
import { A11y, EffectFade, Keyboard, Navigation, Pagination } from "swiper/modules";

// data-slider-gap is in design px; it follows the fluid root like everything else
const designPx = (value) => (value * parseFloat(getComputedStyle(document.documentElement).fontSize)) / 16;
const SPEED = 900;

// data-slider-autoplay: the next slide comes this many ms after one settles, only while the slider is on screen,
// not hovered and not holding focus. Swiper's own autoplay keeps transition-pause state that an outside pause breaks.
function autoplay(swiper, scope, delay) {
  const hold = { view: true, hover: false, focus: false };
  let timer = 0;
  const arm = () => {
    clearTimeout(timer);
    if (!hold.view && !hold.hover && !hold.focus) timer = setTimeout(() => (swiper.isEnd ? swiper.slideTo(0) : swiper.slideNext()), delay);
  };
  const set = (key, value) => {
    hold[key] = value;
    arm();
  };
  swiper.on("slideChangeTransitionEnd", arm);
  scope.addEventListener("pointerenter", () => set("hover", true));
  scope.addEventListener("pointerleave", () => set("hover", false));
  scope.addEventListener("focusin", () => set("focus", true));
  scope.addEventListener("focusout", () => set("focus", false));
  new IntersectionObserver(([entry]) => set("view", !entry.isIntersecting)).observe(swiper.el);
}

// Card sliders: slides shrink with the drag speed (px per ms), to 0.925 at 3, and their CSS transition eases them back.
// A click or a release snaps over the transition, so it starts as a 2.5 drag that dies away by 0.92 a frame.
const SHRINK = { least: 0.925, from: 0.01, span: 2.99, nudge: 2.5, decay: 0.92, rest: 0.01 };
const scaleAt = (speed) => SHRINK.least + (1 - SHRINK.least) * (1 - Math.min(Math.max((speed - SHRINK.from) / SHRINK.span, 0), 1));

function shrinkOnSpeed(swiper) {
  let speed = 0;
  let lastTranslate = swiper.translate;
  let lastTime = performance.now();
  let frame = 0;
  const apply = () => swiper.slides.forEach((slide) => { slide.style.scale = scaleAt(speed).toFixed(3); });
  const stop = () => {
    cancelAnimationFrame(frame);
    speed = 0;
    swiper.slides.forEach((slide) => { slide.style.scale = ""; });
  };
  const track = () => {
    const now = performance.now();
    speed = Math.abs((swiper.translate - lastTranslate) / (now - lastTime || 1));
    lastTranslate = swiper.translate;
    lastTime = now;
    apply();
  };
  const loop = (step) => {
    cancelAnimationFrame(frame);
    const tick = () => {
      step();
      if (speed > SHRINK.rest) frame = requestAnimationFrame(tick);
      else stop();
    };
    frame = requestAnimationFrame(tick);
  };
  swiper.on("setTranslate", track);
  swiper.on("touchEnd", () => loop(track));
  swiper.on("transitionStart", () => {
    speed = SHRINK.nudge;
    loop(() => {
      apply();
      speed *= SHRINK.decay;
    });
  });
  swiper.on("transitionEnd", stop);
}

// data-slider-mode="stack": slides overlap and CSS swaps them, keyed to is-leaving on the old one and is-entering on the new
function stack(swiper) {
  const mark = (slide, name) => {
    swiper.slides.forEach((each) => each.classList.remove(name));
    if (!slide) return;
    void slide.offsetWidth;
    slide.classList.add(name);
  };
  swiper.on("slideChange", () => {
    mark(swiper.slides[swiper.previousIndex], "is-leaving");
    mark(swiper.slides[swiper.activeIndex], "is-entering");
  });
}

export function initSliders() {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.querySelectorAll("[data-slider]").forEach((el) => {
    const scope = el.closest("[data-slider-scope]") || el.parentElement;
    const gap = parseFloat(el.dataset.sliderGap || "0");
    const fade = el.dataset.sliderMode === "fade";
    const stacked = el.dataset.sliderMode === "stack";
    const single = fade || stacked;
    const delay = parseFloat(el.dataset.sliderAutoplay || "0");
    const dots = scope.querySelector("[data-slider-pagination]");
    const start = el.dataset.sliderStart;
    const swiper = new Swiper(el, {
      modules: [A11y, EffectFade, Keyboard, Navigation, Pagination],
      slidesPerView: single ? 1 : "auto",
      spaceBetween: single ? 0 : designPx(gap),
      speed: still.matches || stacked ? 0 : SPEED,
      virtualTranslate: stacked,
      // backface-hidden puts each slide on its own layer, which keeps a stacked slide's panel and photo from interleaving
      maxBackfaceHiddenSlides: stacked ? 0 : 10,
      longSwipesRatio: stacked ? 0.1 : 0.5,
      grabCursor: !fade,
      resistance: false,
      centeredSlides: start !== undefined,
      initialSlide: parseInt(start || "0", 10),
      effect: fade ? "fade" : "slide",
      fadeEffect: { crossFade: true },
      loop: fade,
      keyboard: { enabled: true, onlyInViewport: true },
      navigation: {
        prevEl: scope.querySelector("[data-slider-prev]"),
        nextEl: scope.querySelector("[data-slider-next]"),
      },
      pagination: dots ? { el: dots, clickable: true } : false,
      on: {
        beforeResize(s) {
          if (!single) s.params.spaceBetween = designPx(gap);
        },
      },
    });
    if (stacked) stack(swiper);
    if (delay && !still.matches) autoplay(swiper, scope, delay);
    if (!single && !still.matches) shrinkOnSpeed(swiper);
  });
}
