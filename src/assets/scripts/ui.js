import { Anim } from "./anim.js";
import { initMenuSearch } from "./search.js";

export function lockScroll(lock) {
  const root = document.documentElement;
  if (lock && !root.classList.contains("is-locked")) {
    root.style.setProperty("--scrollbar-gutter", `${window.innerWidth - root.clientWidth}px`);
  }
  // Lenis reads the scroll as it starts, so it must start while the gutter padding still holds the page width
  if (!lock) Anim.start();
  root.classList.toggle("is-locked", lock);
  if (lock) Anim.stop();
}

export function initDevicePixel() {
  const set = () => {
    document.documentElement.style.setProperty("--device-px", `${1 / devicePixelRatio}px`);
    matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener("change", set, { once: true });
  };
  set();
}

export function initPlatform() {
  if (/Windows.*Chrome\//.test(navigator.userAgent)) document.documentElement.classList.add("is-windows-chrome");
}

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

export function initAccordions() {
  document.querySelectorAll("[data-accordion]").forEach((root) => {
    const items = [...root.querySelectorAll("[data-accordion-item]")];
    items.forEach((item) => {
      item.querySelector("[aria-expanded]").addEventListener("click", () => {
        const open = !item.classList.contains("is-open");
        items.forEach((other) => {
          const on = open && other === item;
          other.classList.toggle("is-open", on);
          other.querySelector("[aria-expanded]").setAttribute("aria-expanded", String(on));
        });
        setTimeout(() => window.Anim?.refresh(), 700);
      });
    });
  });
}

export function initFilters() {
  document.querySelectorAll("[data-filter-scope]").forEach((scope) => {
    const tabs = scope.querySelectorAll("[data-filter]");
    const cards = scope.querySelectorAll("[data-filter-groups]");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const group = tab.dataset.filter;
        tabs.forEach((other) => other.setAttribute("aria-pressed", String(other === tab)));
        cards.forEach((card) => {
          card.hidden = group !== "all" && !card.dataset.filterGroups.split(" ").includes(group);
        });
        scope.querySelectorAll("[data-slider]").forEach((slider) => slider.swiper?.update());
        window.Anim?.refresh();
      });
    });
  });
}

export function initNewsFilter() {
  document.querySelectorAll("[data-news-filter]").forEach((root) => {
    const category = root.querySelector("[data-news-category]");
    const search = root.querySelector("[data-news-search]");
    const cards = root.querySelectorAll("[data-news-tag]");
    const apply = () => {
      const term = search.value.trim().toLowerCase();
      cards.forEach((card) => {
        const matches = !category.value || card.dataset.newsTag === category.value;
        card.hidden = !matches || !card.textContent.toLowerCase().includes(term);
      });
      window.Anim?.refresh();
    };
    category.addEventListener("change", apply);
    search.addEventListener("input", apply);
    root.querySelector("form").addEventListener("submit", (e) => e.preventDefault());
  });
}

export function initPromos() {
  document.querySelectorAll("[data-promo]").forEach((promo) => {
    const video = promo.querySelector(".promo__video");
    const preview = promo.querySelector("video[data-ambient]");
    const play = promo.querySelector("button");
    if (!video || !play) return;
    const stop = () => {
      promo.classList.remove("is-playing");
      video.hidden = true;
      if (preview) syncAmbient(preview);
      play.focus();
    };
    play.addEventListener("click", () => {
      if (!video.getAttribute("src")) video.src = video.dataset.src;
      video.hidden = false;
      promo.classList.add("is-playing");
      if (preview) syncAmbient(preview);
      video.focus();
      video.play().catch(stop);
    });
    video.addEventListener("ended", stop);
  });
}

// data-hero-fold: an inner hero gives up this block's text, with its top padding mirrored below, so the two share the first screen (_hero.less)
export function initHeroFold() {
  const sizes = new ResizeObserver((entries) => entries.forEach(({ target, contentBoxSize }) => {
    const pad = parseFloat(getComputedStyle(target).paddingTop);
    target.previousElementSibling.style.setProperty("--hero-fold", `${contentBoxSize[0].blockSize + 2 * pad}px`);
  }));
  document.querySelectorAll("[data-hero-fold]").forEach((block) => {
    if (block.previousElementSibling?.classList.contains("hero--inner")) sizes.observe(block);
  });
}

// a learning card's labels slide up by the height of its hidden text when it opens (_learning.less)
export function initEntryCards() {
  const sizes = new ResizeObserver((entries) => entries.forEach(({ target, borderBoxSize }) => {
    target.parentElement.style.setProperty("--entry-more", `${borderBoxSize[0].blockSize}px`);
  }));
  document.querySelectorAll("[data-entry-more]").forEach((more) => sizes.observe(more));
}

export function initHoverVideos() {
  const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.querySelectorAll("[data-hover-video]").forEach((card) => {
    const video = card.querySelector("video");
    if (!video) return;
    card.addEventListener("pointerenter", () => {
      if (!pointer.matches || still.matches || card.classList.contains("is-open")) return;
      if (!video.getAttribute("src")) video.src = video.dataset.src;
      card.classList.add("is-playing");
      video.play().catch(() => card.classList.remove("is-playing"));
    });
    card.addEventListener("pointerleave", () => {
      if (card.classList.contains("is-open")) return;
      card.classList.remove("is-playing");
      video.pause();
    });
    video.addEventListener("transitionend", () => {
      if (!card.classList.contains("is-playing")) video.currentTime = 0;
    });
  });
}

// data-video-toggle: plays the card's video from the start with sound; the button, its end, Escape or scrolling away closes it
export function initVideoCards() {
  const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  let open = null;
  const away = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.target === open && entry.intersectionRatio < 0.3) close(entry.target);
  }), { threshold: [0, 0.3] });
  const close = (card) => {
    const video = card.querySelector("video");
    const button = card.querySelector("[data-video-toggle]");
    card.classList.remove("is-open");
    button.setAttribute("aria-label", button.dataset.label);
    video.muted = true;
    video.loop = true;
    away.unobserve(card);
    if (open === card) open = null;
    if (card.matches(":hover") && pointer.matches && !still.matches) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      card.classList.remove("is-playing");
      video.pause();
    }
  };
  const play = (card) => {
    const video = card.querySelector("video");
    const button = card.querySelector("[data-video-toggle]");
    if (open) close(open);
    open = card;
    if (!video.getAttribute("src")) video.src = video.dataset.src;
    card.classList.add("is-open", "is-playing");
    button.setAttribute("aria-label", "Close video");
    video.muted = false;
    video.loop = false;
    video.currentTime = 0;
    video.play().catch(() => close(card));
    away.observe(card);
  };
  document.querySelectorAll("[data-video-card]").forEach((card) => {
    const button = card.querySelector("[data-video-toggle]");
    button.dataset.label = button.getAttribute("aria-label");
    button.addEventListener("click", () => (card.classList.contains("is-open") ? close(card) : play(card)));
    card.querySelector("video").addEventListener("ended", () => { if (card.classList.contains("is-open")) close(card); });
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && open) close(open); });
}

// background videos autoplay muted; data-ambient="view" ones play only while on screen, once their reveal has landed
// and while their promo isn't playing; under reduced motion they hold on their first frame. is-live marks one that has
// started, for a fade-in over its still
const ambientStill = window.matchMedia("(prefers-reduced-motion: reduce)");
const ambientOnScreen = new WeakSet();
const REVEALING = '[data-anim="reveal"]:not(.is-revealed, [data-anim-scrub])';
const awaitingReveal = new WeakSet();

// looked up while held, not at load: a data-anim-group only marks its children as reveals once anim starts
function revealing(video) {
  const root = document.documentElement;
  if (!root.hasAttribute("data-anim-live") || root.classList.contains("anim-reduced")) return false;
  const reveal = video.closest(REVEALING);
  if (reveal && !awaitingReveal.has(video)) {
    awaitingReveal.add(video);
    const landed = new MutationObserver(() => {
      if (!reveal.classList.contains("is-revealed")) return;
      landed.disconnect();
      awaitingReveal.delete(video);
      syncAmbient(video);
    });
    landed.observe(reveal, { attributeFilter: ["class"] });
  }
  return Boolean(reveal);
}

function syncAmbient(video) {
  if (ambientStill.matches) {
    video.pause();
    video.currentTime = 0;
  } else if (video.dataset.ambient === "view" && (!ambientOnScreen.has(video) || video.closest(".is-playing") || revealing(video))) {
    video.pause();
  } else {
    video.play().catch(() => {});
  }
}

export function initAmbientVideos() {
  const videos = Array.from(document.querySelectorAll("video[data-ambient]"));
  if (!videos.length) return;
  const view = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
    if (isIntersecting) ambientOnScreen.add(target);
    else ambientOnScreen.delete(target);
    syncAmbient(target);
  }), { threshold: 0.3 });
  videos.forEach((video) => {
    video.addEventListener("playing", () => video.classList.add("is-live"), { once: true });
    if (video.dataset.ambient === "view") view.observe(video);
    syncAmbient(video);
  });
  ambientStill.addEventListener("change", () => videos.forEach(syncAmbient));
}

const MARQUEE_SPEED = 35; // design px per second, the same for every row whatever its length

export function initMarquees() {
  const tracks = Array.from(document.querySelectorAll("[data-marquee]"));
  if (!tracks.length) return;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  const build = () => {
    const scale = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
    tracks.forEach((track) => {
      const list = track.querySelector("ul");
      if (!list) return;
      track.classList.remove("is-running");
      track.querySelectorAll("[data-marquee-copy]").forEach((copy) => copy.remove());
      list.style.width = "";
      list.querySelectorAll("img").forEach((img) => {
        img.style.width = `${parseFloat(img.getAttribute("width")) * scale}px`;
      });
      if (still.matches) return;
      // whole device pixels, or each copy sits a fraction of a pixel out of step, draws differently and the loop snaps as it wraps
      const width = Math.ceil(list.getBoundingClientRect().width * devicePixelRatio) / devicePixelRatio;
      list.style.width = `${width}px`;
      const lane = track.parentElement.clientWidth;
      if (!width) return;
      const copies = Math.ceil(lane / width) + 1;
      for (let i = 0; i < copies; i++) {
        const copy = list.cloneNode(true);
        copy.setAttribute("aria-hidden", "true");
        copy.setAttribute("data-marquee-copy", "");
        copy.querySelectorAll("a").forEach((a) => a.setAttribute("tabindex", "-1"));
        track.append(copy);
      }
      // the keyframes move one list's share of the track, so the loop stays seamless whatever the text measures
      track.style.setProperty("--marquee-lists", copies + 1);
      track.style.setProperty("--marquee-time", `${width / (MARQUEE_SPEED * scale)}s`);
      track.classList.add("is-running");
    });
  };
  build();
  document.fonts?.ready.then(build);
  // a phone's toolbar changes only the height, which leaves both of these alone
  const size = () => `${window.innerWidth} ${getComputedStyle(document.documentElement).fontSize}`;
  let built = size();
  let timer = 0;
  window.addEventListener("resize", () => {
    if (size() === built) return;
    built = size();
    clearTimeout(timer);
    timer = setTimeout(build, 200);
  });
  still.addEventListener("change", build);
}

export function initScrollState() {
  const root = document.documentElement;
  const sync = () => root.classList.toggle("is-scrolled", window.scrollY > 0);
  sync();
  window.addEventListener("scroll", sync, { passive: true });
}

export function initStickyHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const tolerance = 8;
  let zone = header.offsetHeight;
  let anchor = window.scrollY;
  const sync = () => {
    const y = window.scrollY;
    if (y <= 0) {
      header.classList.remove("is-stuck", "is-compact", "is-hidden");
      anchor = 0;
      return;
    }
    if (!header.classList.contains("is-stuck")) {
      if (y > zone) {
        header.classList.add("is-instant", "is-held", "is-stuck", "is-compact", "is-hidden");
        void header.offsetHeight;
        header.classList.remove("is-instant");
      }
      anchor = y;
      return;
    }
    header.classList.toggle("is-compact", y > zone);
    if (y <= zone || Math.abs(y - anchor) >= tolerance) {
      header.classList.toggle("is-hidden", y > zone && y > anchor);
      anchor = y;
    }
  };
  sync();
  window.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", () => { zone = header.offsetHeight; });
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
    const wide = menu.classList.contains("is-searching") || items.some((item) => item.classList.contains("is-open"));
    menu.classList.toggle("is-wide", wide);
    if (wide) menu.classList.add("has-widened");
  };

  const search = initMenuSearch(menu, { closeItems, syncWide });

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
      lockScroll(true);
      menu.classList.remove("has-widened");
      fit();
    }
    menu.classList.toggle("is-open", open);
    openers.forEach((b) => b.setAttribute("aria-expanded", String(open)));
    outside.forEach((el) => { el.inert = open; });
    if (open) {
      opener = trigger || document.activeElement;
      panel.focus({ preventScroll: true });
    } else {
      closeItems();
      search.close();
      if (opener) opener.focus({ preventScroll: true });
      // keep the scrollbar away until the panel has left, or the fixed menu narrows mid-slide
      unlock = setTimeout(() => lockScroll(false), parseFloat(getComputedStyle(menu).transitionDelay) * 1000);
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
      search.close();
    });

    links.forEach((link) => {
      link.addEventListener("pointerenter", () => canHover.matches && show(link));
      link.addEventListener("focus", () => show(link));
    });
  });
}
