import { Anim } from "./anim.js";
import { initDisclosures, initMenu } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
  Anim.init();
  initDisclosures();
  initMenu();
});
