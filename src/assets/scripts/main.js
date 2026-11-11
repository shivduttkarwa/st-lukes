import { Anim } from "./anim.js";
import { initForms, initSelects } from "./forms.js";
import { initPreloader } from "./preloader.js";
import { initSliders } from "./slider.js";
import { initTransitions } from "./transition.js";
import { initAccordions, initAmbientVideos, initDevicePixel, initDisclosures, initFocusMode, initEagerPhotos, initEntryCards, initFilters, initHeroFold, initHoverVideos, initMarquees, initVideoCards, initMenu, initNewsFilter, initPlatform, initPress, initPromos, initScrollState, initStickyHeader } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
  initFocusMode();
  initDevicePixel();
  initPlatform();
  const preloaded = initPreloader();
  initTransitions();
  initScrollState();
  initStickyHeader();
  initSliders();
  initEagerPhotos();
  initSelects();
  initMarquees();
  initAmbientVideos();
  // pagereveal has fired by the first frame, so an arrival's transition is known by then
  // a hero with nothing behind its copy enters as the circle opens, or the circle opens on a blank panel; below 992 every hero
  // enters halfway through the circle (0.8s there, _transition.less), once it has passed the eyebrow, so no fade ends unseen
  const early = document.querySelector('[data-anim-arrival="early"]');
  const halfway = () => window.pageOpening?.then(() => new Promise((resolve) => setTimeout(resolve, 400)));
  const start = () => (!matchMedia("(min-width: 992px)").matches ? halfway() : early ? window.pageOpening : window.pageArrival);
  const arrival = new Promise((resolve) => requestAnimationFrame(() => resolve(start())));
  Anim.init({ after: preloaded || arrival, afterMax: preloaded ? 10000 : 2000 });
  initDisclosures();
  initAccordions();
  initFilters();
  initNewsFilter();
  initPress();
  initForms();
  initMenu();
  initPromos();
  initHoverVideos();
  initVideoCards();
  initEntryCards();
  initHeroFold();
});
