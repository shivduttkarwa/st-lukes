import { Anim } from "./anim.js";
import { initForms, initSelects } from "./forms.js";
import { initPreloader } from "./preloader.js";
import { initSliders } from "./slider.js";
import { initAccordions, initAmbientVideos, initDevicePixel, initDisclosures, initEntryCards, initFilters, initHoverVideos, initMarquees, initVideoCards, initMenu, initNewsFilter, initPlatform, initPromos, initScrollState, initStickyHeader } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
  initDevicePixel();
  initPlatform();
  const preloaded = initPreloader();
  initScrollState();
  initStickyHeader();
  initSliders();
  initSelects();
  initMarquees();
  initAmbientVideos();
  Anim.init({ after: preloaded, afterMax: 10000 });
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
});
