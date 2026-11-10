// The leaving page's side of the page transition (06-animation/_transition.less; the arriving side is the pagereveal
// script in partials/head.njk)

// marked, so a page restored from the cache can take the name back (head.njk)
function name(el, value) {
  el.style.viewTransitionName = value;
  el.setAttribute("data-vt-named", "");
}

export function initTransitions() {
  if (!("PageSwapEvent" in window)) return;

  window.addEventListener("pageswap", (e) => {
    const transition = e.viewTransition;
    if (!transition) return;
    if (e.activation?.navigationType === "traverse") transition.types.add("back");
    // an arrival took the root out of the capture (head.njk); leaving, the page is captured whole
    document.documentElement.style.viewTransitionName = "";
    // a header that is stuck, compact or under the open menu would crossfade out of step with the next page's resting
    // one, so it leaves with the page and the next header fades in on its own
    if (document.querySelector("[data-menu].is-open, .site-header.is-stuck")) {
      document.querySelectorAll(".site-header").forEach((header) => name(header, "none"));
    }
  });
}
