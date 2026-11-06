import { Anim } from "./anim.js";
import { initForms, initSelects } from "./forms.js";
import { initPreloader } from "./preloader.js";
import { initSliders } from "./slider.js";
import { initTransitions } from "./transition.js";
import { initAccordions, initAmbientVideos, initDevicePixel, initDisclosures, initEntryCards, initFilters, initHeroFold, initHoverVideos, initMarquees, initVideoCards, initMenu, initNewsFilter, initPlatform, initPromos, initScrollState, initStickyHeader } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
  initDevicePixel();
  initPlatform();
  const preloaded = initPreloader();
  initTransitions();
  initScrollState();
  initStickyHeader();
  initSliders();
  initSelects();
  initMarquees();
  initAmbientVideos();
  // pagereveal has fired by the first frame, so an arrival's transition is known by then
  const arrival = new Promise((resolve) => requestAnimationFrame(() => resolve(window.pageArrival)));
  Anim.init({ after: preloaded || arrival, afterMax: preloaded ? 10000 : 2000 });
  initDisclosures();
  initAccordions();
  initFilters();
  initNewsFilter();
  initForms();
  initMenu();
  initPromos();
  initHoverVideos();
  initVideoCards();
  initEntryCards();
  initHeroFold();
});
