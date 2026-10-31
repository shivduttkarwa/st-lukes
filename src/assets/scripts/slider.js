import Swiper from "swiper";
import { A11y, EffectFade, Keyboard, Navigation, Pagination } from "swiper/modules";

// data-slider-gap is in design px; it follows the fluid root like everything else
const designPx = (value) => (value * parseFloat(getComputedStyle(document.documentElement).fontSize)) / 16;

// data-slider-autoplay: the next slide comes this many ms after one settles, only while the slider is on screen,
// not hovered and not holding focus. Swiper's own autoplay keeps transition-pause state that an outside pause breaks.
function autoplay(swiper, scope, delay) {
  const hold = { view: true, hover: false, focus: false };
  let timer = 0;
  const arm = () => {
    clearTimeout(timer);
    if (!hold.view && !hold.hover && !hold.focus) timer = setTimeout(() => swiper.slideNext(), delay);
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

export function initSliders() {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.querySelectorAll("[data-slider]").forEach((el) => {
    const scope = el.closest("[data-slider-scope]") || el.parentElement;
    const gap = parseFloat(el.dataset.sliderGap || "0");
    const fade = el.dataset.sliderMode === "fade";
    const delay = parseFloat(el.dataset.sliderAutoplay || "0");
    const dots = scope.querySelector("[data-slider-pagination]");
    const start = el.dataset.sliderStart;
    const swiper = new Swiper(el, {
      modules: [A11y, EffectFade, Keyboard, Navigation, Pagination],
      slidesPerView: fade ? 1 : "auto",
      spaceBetween: fade ? 0 : designPx(gap),
      speed: still.matches ? 0 : 900,
      grabCursor: !fade,
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
          if (!fade) s.params.spaceBetween = designPx(gap);
        },
      },
    });
    if (delay && !still.matches) autoplay(swiper, scope, delay);
  });
}
