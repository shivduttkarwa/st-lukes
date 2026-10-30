import { Anim } from "./anim.js";
import { initPreloader } from "./preloader.js";
import { initSliders } from "./slider.js";
import { initAmbientVideos, initDevicePixel, initDisclosures, initHoverVideos, initMarquees, initMenu, initPromos, initScrollState } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
  initDevicePixel();
  const preloaded = initPreloader();
  initScrollState();
  initSliders();
  initMarquees();
  initAmbientVideos();
  Anim.init({ after: preloaded, afterMax: 10000 });
  initDisclosures();
  initMenu();
  initPromos();
  initHoverVideos();
});
