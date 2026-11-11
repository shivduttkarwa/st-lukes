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
  // only keyboard focus holds it: a clicked dot or arrow keeps focus, which stopped autoplay for good after a manual change
  scope.addEventListener("focusin", (event) => set("focus", event.target.matches(".is-keyboard :focus-visible")));
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
  // a change asked for mid-swap waits for the swap's animations to finish, then plays (the latest wins): cutting a swap
  // short snapped its photo and text to their ends
  let busy = false;
  let queued = null;
  const go = swiper.slideTo.bind(swiper);
  swiper.slideTo = (index, speed, runCallbacks, internal) => {
    if (busy && !internal) {
      queued = index;
      return false;
    }
    return go(index, speed, runCallbacks, internal);
  };
  const mark = (slide, name) => {
    swiper.slides.forEach((each) => each.classList.remove(name));
    if (!slide) return;
    void slide.offsetWidth;
    slide.classList.add(name);
  };
  swiper.on("slideChange", () => {
    const leaving = swiper.slides[swiper.previousIndex];
    const entering = swiper.slides[swiper.activeIndex];
    // is-back: the text leaves downwards and arrives from above (_news.less)
    swiper.el.classList.toggle("is-back", swiper.activeIndex < swiper.previousIndex);
    mark(leaving, "is-leaving");
    mark(entering, "is-entering");
    const running = [leaving, entering]
      .flatMap((slide) => (slide ? slide.getAnimations({ subtree: true }) : []))
      .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity);
    if (!running.length) return;
    busy = true;
    Promise.all(running.map((animation) => animation.finished.catch(() => {}))).then(() => {
      busy = false;
      const next = queued;
      queued = null;
      if (next !== null && next !== swiper.activeIndex) swiper.slideTo(next);
    });
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
    // Safari loads a lazy photo only once it is on screen, so a slide arrived blank and its photo popped in
    new IntersectionObserver((entries, watch) => {
      if (!entries[0].isIntersecting) return;
      watch.disconnect();
      el.querySelectorAll('img[loading="lazy"]').forEach((img) => {
        img.loading = "eager";
        img.decode().catch(() => {});
      });
    }, { rootMargin: "100% 0px" }).observe(el);
    if (stacked) stack(swiper);
    if (delay && !still.matches) autoplay(swiper, scope, delay);
    if (!single && !still.matches) shrinkOnSpeed(swiper);
  });
}
