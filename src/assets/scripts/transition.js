// The leaving page's side of the page transition (06-animation/_transition.less; the arriving side is the pagereveal
// script in partials/head.njk)

export function initTransitions() {
  if (!("PageSwapEvent" in window)) return;

  window.addEventListener("pageswap", (e) => {
    const transition = e.viewTransition;
    if (!transition) return;
    if (e.activation?.navigationType === "traverse") transition.types.add("back");
    // an arrival took the root out of the capture (head.njk); leaving, the page is captured whole, header included
    document.documentElement.style.viewTransitionName = "";
  });
}
