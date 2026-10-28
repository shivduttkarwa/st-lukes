import { Anim } from "./anim.js";
import { initDisclosures } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
  Anim.init();
  initDisclosures();
});
