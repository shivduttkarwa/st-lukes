import { Anim } from "./anim.js";
import { initSliders } from "./slider.js";
import { initAmbientVideos, initDisclosures, initHoverVideos, initMarquees, initMenu, initPromos, initScrollState } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
  initScrollState();
  initSliders();
  initMarquees();
  initAmbientVideos();
  Anim.init();
  initDisclosures();
  initMenu();
  initPromos();
  initHoverVideos();
});
