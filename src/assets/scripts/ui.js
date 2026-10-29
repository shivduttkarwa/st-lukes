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

  menu.querySelectorAll(".menu__top, .menu__list, .menu__secondary, .menu__social, .menu__sub-list").forEach((list) => {
    [...list.children].forEach((el, i) => el.style.setProperty("--i", i));
  });

  const setItem = (item, open) => {
    item.classList.toggle("is-open", open);
    item.querySelector("[aria-expanded]").setAttribute("aria-expanded", String(open));
  };
  const closeItems = (except) => items.forEach((item) => {
    if (item !== except && item.classList.contains("is-open")) setItem(item, false);
  });
  const syncWide = () => menu.classList.toggle("is-wide", items.some((item) => item.classList.contains("is-open")));

  // the 1024px design frame is 64rem; never shrink its 18px links below 12px
  const fit = () => {
    const rem = parseFloat(getComputedStyle(root).fontSize);
    const zoom = Math.min(1, Math.max(12 / (1.125 * rem), window.innerHeight / (64 * rem)));
    menu.style.setProperty("--menu-zoom", zoom.toFixed(4));
  };

  let unlock = 0;
  const setOpen = (open, trigger) => {
    if (open === menu.classList.contains("is-open")) return;
    clearTimeout(unlock);
    if (open) {
      if (!root.classList.contains("is-locked")) {
        root.style.setProperty("--scrollbar-gutter", `${window.innerWidth - root.clientWidth}px`);
      }
      root.classList.add("is-locked");
      fit();
    }
    menu.classList.toggle("is-open", open);
    openers.forEach((b) => b.setAttribute("aria-expanded", String(open)));
    outside.forEach((el) => { el.inert = open; });
    if (open) {
      opener = trigger || document.activeElement;
      Anim.stop();
      panel.focus({ preventScroll: true });
    } else {
      closeItems();
      syncWide();
      if (opener) opener.focus({ preventScroll: true });
      // keep the scrollbar away until the panel has left, or the fixed menu narrows mid-slide
      unlock = setTimeout(() => {
        root.classList.remove("is-locked");
        Anim.start();
      }, parseFloat(getComputedStyle(menu).transitionDelay) * 1000);
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
  window.addEventListener("resize", fit);

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
    const links = item.querySelectorAll("[data-thumb]");
    links.forEach((link) => {
      const show = () => {
        swapThumb(thumb, link.dataset.thumb);
        links.forEach((other) => other.classList.toggle("is-current", other === link));
      };
      link.addEventListener("pointerenter", () => canHover.matches && show());
      link.addEventListener("focus", show);
    });
  });
}
