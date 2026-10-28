import { Anim } from "./anim.js";

export function initDisclosures() {
  document.querySelectorAll("[data-disclosure]").forEach((root) => {
    const toggle = root.querySelector("[aria-expanded]");
    if (!toggle) return;
    const set = (open) => {
      root.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };
    toggle.addEventListener("click", () => set(!root.classList.contains("is-open")));
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        set(false);
        toggle.focus();
      }
    });
    document.addEventListener("click", (e) => {
      if (!root.contains(e.target)) set(false);
    });
  });
}

export function initMenu() {
  const menu = document.querySelector("[data-menu]");
  if (!menu) return;
  const root = document.documentElement;
  const panel = menu.querySelector(".menu__panel");
  const openers = document.querySelectorAll("[data-menu-open]");
  const items = [...menu.querySelectorAll(".menu__item")];
  const outside = [...document.body.children].filter((el) => el !== menu && el.tagName !== "SCRIPT");
  const canHover = window.matchMedia("(hover: hover)");
  let opener = null;

  const setItem = (item, open) => {
    item.classList.toggle("is-open", open);
    item.querySelector("[aria-expanded]").setAttribute("aria-expanded", String(open));
  };
  const closeItems = (except) => items.forEach((item) => {
    if (item !== except && item.classList.contains("is-open")) setItem(item, false);
  });
  const syncWide = () => menu.classList.toggle("is-wide", items.some((item) => item.classList.contains("is-open")));

  const setOpen = (open, trigger) => {
    if (open === menu.classList.contains("is-open")) return;
    if (open) root.style.setProperty("--scrollbar-gutter", `${window.innerWidth - root.clientWidth}px`);
    menu.classList.toggle("is-open", open);
    root.classList.toggle("is-locked", open);
    openers.forEach((b) => b.setAttribute("aria-expanded", String(open)));
    outside.forEach((el) => { el.inert = open; });
    if (open) {
      opener = trigger || document.activeElement;
      Anim.stop();
      panel.focus({ preventScroll: true });
    } else {
      Anim.start();
      closeItems();
      syncWide();
      if (opener) opener.focus();
    }
  };

  const swapThumb = (thumb, src) => {
    const current = thumb.querySelector("img");
    if (!src || !current || current.getAttribute("src") === src) return;
    const next = current.cloneNode();
    next.src = src;
    next.classList.add("is-entering");
    thumb.append(next);
    requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove("is-entering")));
    const done = () => current.remove();
    next.addEventListener("transitionend", done, { once: true });
    setTimeout(done, 700);
  };

  openers.forEach((b) => b.addEventListener("click", () => setOpen(true, b)));
  menu.querySelectorAll("[data-menu-close]").forEach((el) => el.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) setOpen(false);
  });

  items.forEach((item) => {
    const toggle = item.querySelector("button[aria-expanded]");
    if (!toggle) return;
    toggle.addEventListener("click", () => {
      const open = !item.classList.contains("is-open");
      closeItems(item);
      setItem(item, open);
      syncWide();
    });
    const thumb = item.querySelector(".menu__thumb");
    if (!thumb) return;
    item.querySelectorAll("[data-thumb]").forEach((link) => {
      link.addEventListener("pointerenter", () => canHover.matches && swapThumb(thumb, link.dataset.thumb));
      link.addEventListener("focus", () => swapThumb(thumb, link.dataset.thumb));
    });
  });
}
