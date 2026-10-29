import Swiper from "swiper";
import { A11y, Keyboard, Navigation } from "swiper/modules";

// data-slider-gap is in design px; it follows the fluid root like everything else
const designPx = (value) => (value * parseFloat(getComputedStyle(document.documentElement).fontSize)) / 16;

export function initSliders() {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.querySelectorAll("[data-slider]").forEach((el) => {
    const scope = el.closest("[data-slider-scope]") || el.parentElement;
    const gap = parseFloat(el.dataset.sliderGap || "0");
    new Swiper(el, {
      modules: [A11y, Keyboard, Navigation],
      slidesPerView: "auto",
      spaceBetween: designPx(gap),
      speed: still.matches ? 0 : 900,
      grabCursor: true,
      keyboard: { enabled: true, onlyInViewport: true },
      navigation: {
        prevEl: scope.querySelector("[data-slider-prev]"),
        nextEl: scope.querySelector("[data-slider-next]"),
      },
      on: {
        beforeResize(swiper) {
          swiper.params.spaceBetween = designPx(gap);
        },
      },
    });
  });
}
