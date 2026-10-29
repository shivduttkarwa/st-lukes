import { Anim } from "./anim.js";
import { initDisclosures, initHoverVideos, initMenu, initPromos, initScrollState } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
  initScrollState();
  Anim.init();
  initDisclosures();
  initMenu();
  initPromos();
  initHoverVideos();
});
