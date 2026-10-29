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

export function initPromos() {
  document.querySelectorAll("[data-promo]").forEach((promo) => {
    const video = promo.querySelector("video");
    const play = promo.querySelector("button");
    if (!video || !play) return;
    const stop = () => {
      promo.classList.remove("is-playing");
      video.hidden = true;
      play.focus();
    };
    play.addEventListener("click", () => {
      if (!video.getAttribute("src")) video.src = video.dataset.src;
      video.hidden = false;
      promo.classList.add("is-playing");
      video.focus();
      video.play().catch(stop);
    });
    video.addEventListener("ended", stop);
  });
}

export function initHoverVideos() {
  const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.querySelectorAll("[data-hover-video]").forEach((card) => {
    const video = card.querySelector("video");
    if (!video) return;
    card.addEventListener("pointerenter", () => {
      if (!pointer.matches || still.matches) return;
      if (!video.getAttribute("src")) video.src = video.dataset.src;
      card.classList.add("is-playing");
      video.play().catch(() => card.classList.remove("is-playing"));
    });
    card.addEventListener("pointerleave", () => {
      card.classList.remove("is-playing");
      video.pause();
    });
    video.addEventListener("transitionend", () => {
      if (!card.classList.contains("is-playing")) video.currentTime = 0;
    });
  });
}

export function initScrollState() {
  const root = document.documentElement;
  const sync = () => root.classList.toggle("is-scrolled", window.scrollY > 0);
  sync();
  window.addEventListener("scroll", sync, { passive: true });
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
  const syncWide = () => {
    const wide = items.some((item) => item.classList.contains("is-open"));
    menu.classList.toggle("is-wide", wide);
    if (wide) menu.classList.add("has-widened");
  };

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
      menu.classList.remove("has-widened");
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

  openers.forEach((b) => b.addEventListener("click", () => setOpen(true, b)));
  menu.querySelectorAll("[data-menu-close]").forEach((el) => el.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) setOpen(false);
  });
  window.addEventListener("resize", fit);

  const thumb = menu.querySelector(".menu__thumb");
  const base = thumb?.appendChild(Object.assign(document.createElement("img"), { alt: "", decoding: "async" }));
  let shown = null;

  const showThumb = (src, instant) => {
    if (!base || !src) return;
    if (instant) {
      thumb.querySelectorAll(".is-swap").forEach((img) => img.remove());
      base.classList.remove("is-leaving");
      base.src = shown = src;
      return;
    }
    if (src === shown) return;
    shown = src;
    const next = base.cloneNode();
    next.classList.remove("is-leaving");
    next.classList.add("is-swap");
    next.src = src;
    next.decode().catch(() => {}).then(() => {
      if (shown !== src) return;
      const prev = thumb.lastElementChild;
      prev.getAnimations().forEach((a) => a.finish());
      while (prev.previousElementSibling && prev.previousElementSibling !== base) prev.previousElementSibling.remove();
      prev.classList.add("is-leaving");
      thumb.append(next);
      const prune = () => {
        if (!next.isConnected) return;
        while (next.previousElementSibling !== base) next.previousElementSibling.remove();
      };
      if (next.getAnimations().length) next.addEventListener("animationend", prune, { once: true });
      else prune();
    });
  };

  items.forEach((item) => {
    const toggle = item.querySelector("button[aria-expanded]");
    if (!toggle) return;
    const links = [...item.querySelectorAll("[data-thumb]")];
    const show = (link) => {
      links.forEach((other) => other.classList.toggle("is-current", other === link));
      showThumb(link.dataset.thumb);
    };

    toggle.addEventListener("click", () => {
      const open = !item.classList.contains("is-open");
      if (open && links.length) {
        const switching = items.some((other) => other !== item && other.classList.contains("is-open"));
        links.forEach((link, i) => {
          link.classList.toggle("is-current", i === 0);
          new Image().src = link.dataset.thumb;
        });
        showThumb(links[0].dataset.thumb, !switching);
      }
      closeItems(item);
      setItem(item, open);
      syncWide();
    });

    links.forEach((link) => {
      link.addEventListener("pointerenter", () => canHover.matches && show(link));
      link.addEventListener("focus", () => show(link));
    });
  });
}
