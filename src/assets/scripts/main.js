import { Anim } from "./anim.js";
import { initPreloader } from "./preloader.js";
import { initSliders } from "./slider.js";
import { initAccordions, initAmbientVideos, initDevicePixel, initDisclosures, initFilters, initHoverVideos, initMarquees, initMenu, initNewsFilter, initPromos, initScrollState } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
  initDevicePixel();
  const preloaded = initPreloader();
  initScrollState();
  initSliders();
  initMarquees();
  initAmbientVideos();
  Anim.init({ after: preloaded, afterMax: 10000 });
  initDisclosures();
  initAccordions();
  initFilters();
  initNewsFilter();
  initMenu();
  initPromos();
  initHoverVideos();
});
