import { Anim } from "./anim.js";
import { initSliders } from "./slider.js";
import { initDisclosures, initHoverVideos, initMenu, initPromos, initScrollState } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
  initScrollState();
  initSliders();
  Anim.init();
  initDisclosures();
  initMenu();
  initPromos();
  initHoverVideos();
});
