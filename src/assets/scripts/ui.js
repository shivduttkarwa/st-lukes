import { Anim } from "./anim.js";
import { initMenuSearch } from "./search.js";
import { gsap } from "gsap";

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
  if (/Chrome\//.test(navigator.userAgent)) document.documentElement.classList.add("has-glass-lens");
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

// panels move in whole pixels: an eased height that creeps under a pixel a frame leaves every row below shimmering as it settles
export function initAccordions() {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ease = "cubic-bezier(0.4, 0, 0.2, 1)";
  document.querySelectorAll("[data-accordion]").forEach((root) => {
    const items = [...root.querySelectorAll("[data-accordion-item]")];
    const move = (item, open, from) => {
      const panel = item.querySelector("[data-accordion-panel]");
      if (!panel || still.matches) return null;
      const content = panel.firstElementChild;
      gsap.killTweensOf([panel, content]);
      gsap.set(panel, { height: "auto", visibility: "visible" });
      const to = open ? panel.offsetHeight : 0;
      if (open && !from) gsap.set(content, { opacity: 0 });
      return gsap.timeline({ onComplete: () => gsap.set([panel, content], { clearProps: "height,visibility,opacity" }) })
        .fromTo(panel, { height: from }, { height: to, duration: 0.6, ease, snap: { height: 1 } }, 0)
        .to(content, open ? { opacity: 1, duration: 0.45, ease: "power1.out" } : { opacity: 0, duration: 0.25, ease: "power1.in" }, open ? 0.15 : 0);
    };
    items.forEach((item) => {
      item.querySelector("[aria-expanded]").addEventListener("click", () => {
        const open = !item.classList.contains("is-open");
        // heights are read before any class changes, so a row caught mid-move carries on from where it is
        const changes = items
          .map((other) => ({ other, on: open && other === item, from: other.querySelector("[data-accordion-panel]")?.offsetHeight ?? 0 }))
          .filter(({ other, on }) => on !== other.classList.contains("is-open"));
        changes.forEach(({ other, on }) => {
          other.classList.toggle("is-open", on);
          other.querySelector("[aria-expanded]").setAttribute("aria-expanded", String(on));
        });
        const tl = gsap.timeline({ onComplete: () => window.Anim?.refresh() });
        changes.forEach(({ other, on, from }) => {
          const step = move(other, on, from);
          if (step) tl.add(step, 0);
        });
        if (!tl.getChildren().length) window.Anim?.refresh();
      });
    });
  });
}

function filterable(cards, settle, place = 0) {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  const grid = cards[0]?.parentElement;
  const slider = grid?.closest("[data-slider]");
  // hidden cards carry a class, not the attribute: Bootstrap makes [hidden] !important, which a leaving card must lift to fade out
  const hide = (card, on) => card.classList.toggle("is-hidden", on);
  const shown = (card) => !card.classList.contains("is-hidden");
  cards.forEach((card) => { if (card.hidden) { card.hidden = false; hide(card, true); } });
  // a hidden card's lazy photo would only start loading as the card arrives
  if (grid) new IntersectionObserver((entries, watch) => {
    if (!entries[0].isIntersecting) return;
    watch.disconnect();
    cards.filter((card) => !shown(card)).forEach((card) => card.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = "eager"; }));
  }, { rootMargin: "100% 0px" }).observe(grid);
  const restart = () => {
    slider?.swiper?.update();
    slider?.swiper?.slideTo(0, 0);
  };
  let change = null;
  let queued = null;
  // order is the chosen tab's place in the row: a slider's cards move the way the row was travelled
  const apply = (shows, order = place) => {
    const count = cards.filter(shows).length;
    // a slider's change always finishes; the latest choice made during it plays next
    if (slider && change?.isActive()) {
      queued = [shows, order];
      return count;
    }
    const step = order < place ? -1 : 1;
    place = order;
    if (cards.every((card) => shown(card) === shows(card))) return count;
    if (still.matches || !grid) {
      cards.forEach((card) => hide(card, !shows(card)));
      restart();
      settle();
      return count;
    }
    change?.progress(1);
    // a card still playing its scroll reveal would carry on under the change
    gsap.killTweensOf(cards);
    const out = cards.filter(shown);
    const into = cards.filter(shows);
    if (slider) {
      const edge = document.documentElement.clientWidth;
      const frame = slider.getBoundingClientRect();
      const lane = grid.getBoundingClientRect();
      // the leaving cards are copied where they stand, so the new set can start in before the last of them has gone
      const ghosts = out.filter((card) => {
        const box = card.getBoundingClientRect();
        return box.right > 0 && box.left < edge;
      }).map((card) => {
        const ghost = card.cloneNode(true);
        ghost.removeAttribute("data-anim");
        ghost.removeAttribute("href");
        ghost.setAttribute("aria-hidden", "true");
        ghost.inert = true;
        ghost.style.cssText = `position: absolute; left: ${lane.left - frame.left + card.offsetLeft}px; top: ${lane.top - frame.top + card.offsetTop}px; width: ${card.offsetWidth}px; height: ${card.offsetHeight}px; margin: 0; pointer-events: none;`;
        slider.append(ghost);
        return ghost;
      });
      cards.forEach((card) => hide(card, !into.includes(card)));
      restart();
      slider.swiper.allowTouchMove = false;
      gsap.set(into, { x: 0, y: 0, xPercent: 0, autoAlpha: 1 });
      const arriving = into.filter((card) => frame.left + card.offsetLeft < edge);
      change = gsap.timeline({
        onComplete: () => {
          ghosts.forEach((ghost) => ghost.remove());
          into.forEach((card) => card.classList.add("is-revealed"));
          gsap.set(into, { clearProps: "transform,opacity" });
          slider.swiper.allowTouchMove = true;
          change = null;
          settle();
          const next = queued;
          queued = null;
          if (next) apply(...next);
        },
      });
      // the leading card moves first, so none slides into a neighbour still showing
      const from = step < 0 ? "end" : "start";
      change
        .to(ghosts, { xPercent: -25 * step, autoAlpha: 0, duration: 0.45, ease: "power2.in", stagger: { each: 0.06, from } }, 0)
        .fromTo(arriving, { xPercent: 35 * step, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out", stagger: { each: 0.08, from } }, 0.3);
      return count;
    }
    // the set on screen fades out, the new set fades in where it belongs, and the grid's height eases between them
    const height = grid.offsetHeight;
    cards.forEach((card) => hide(card, !into.includes(card)));
    const to = grid.offsetHeight;
    cards.forEach((card) => hide(card, !out.includes(card)));
    gsap.set(grid, { height, overflow: "clip" });
    change = gsap.timeline({
      onComplete: () => {
        into.forEach((card) => card.classList.add("is-revealed"));
        // visibility stays: the reveal guard hides a reveal without its inline value
        gsap.set(into, { clearProps: "transform,opacity" });
        gsap.set(grid, { clearProps: "height,overflow" });
        settle();
      },
    })
      .to(out, { autoAlpha: 0, duration: 0.2, ease: "power1.out" })
      .call(() => cards.forEach((card) => hide(card, !into.includes(card))))
      .to(grid, { height: to, duration: 0.45, ease: "power2.inOut" }, 0.15)
      .fromTo(into, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out", stagger: { amount: 0.15 }, snap: { y: 1 }, immediateRender: false }, 0.2);
    return count;
  };
  return apply;
}

export function initFilters() {
  document.querySelectorAll("[data-filter-scope]").forEach((scope) => {
    const tabs = [...scope.querySelectorAll("[data-filter]")];
    const list = scope.querySelector("[data-filter-tabs]");
    const filter = filterable([...scope.querySelectorAll("[data-filter-groups]")], () => {
      scope.querySelectorAll("[data-slider]").forEach((slider) => slider.swiper?.update());
      window.Anim?.refresh();
    }, tabs.findIndex((tab) => tab.getAttribute("aria-pressed") === "true"));
    const pressed = () => tabs.find((tab) => tab.getAttribute("aria-pressed") === "true");
    // the tab's layout box without its reveal transform, snapped as drawn: offset* rounding left a thin marker a pixel off
    const snap = (value) => Math.round(value * devicePixelRatio) / devicePixelRatio;
    const mark = (tab) => {
      if (!list || !tab) return;
      const base = list.getBoundingClientRect();
      const box = tab.getBoundingClientRect();
      const { m41: dx, m42: dy } = new DOMMatrixReadOnly(getComputedStyle(tab).transform.replace("none", ""));
      const left = base.left + scrollX;
      const top = base.top + scrollY;
      const x = box.left - dx + scrollX;
      const y = box.top - dy + scrollY;
      list.style.setProperty("--marker-x", `${snap(x) - snap(left)}px`);
      list.style.setProperty("--marker-y", `${snap(y) - snap(top)}px`);
      list.style.setProperty("--marker-w", `${snap(x + box.width) - snap(x)}px`);
      list.style.setProperty("--marker-h", `${snap(y + box.height) - snap(y)}px`);
    };
    // once the tabs wrap the marker would cut across rows, so each tab fades its own fill instead
    const wraps = () => tabs.some((tab) => tab.offsetTop !== tabs[0].offsetTop);
    window.addEventListener("resize", () => {
      if (!list?.classList.contains("has-marker")) return;
      if (wraps()) list.classList.remove("has-marker");
      else mark(pressed());
    });
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const last = pressed();
        if (tab === last) return;
        if (list && wraps()) list.classList.remove("has-marker");
        else if (list && !list.classList.contains("has-marker")) {
          mark(last);
          list.classList.add("has-marker");
          void list.offsetWidth; // the marker is drawn under the last tab before it moves
        }
        tabs.forEach((other) => other.setAttribute("aria-pressed", String(other === tab)));
        mark(tab);
        const group = tab.dataset.filter;
        filter((card) => group === "all" || card.dataset.filterGroups.split(" ").includes(group), tabs.indexOf(tab));
      });
    });
  });
}

// touch has no hover, so a tapped [data-press] link keeps its hover look while the next page loads
export function initPress() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-press][href]");
    if (!link) return;
    link.classList.add("is-pressed");
    setTimeout(() => link.classList.remove("is-pressed"), 1500);
  });
  window.addEventListener("pageshow", () => document.querySelectorAll(".is-pressed").forEach((link) => link.classList.remove("is-pressed")));
}

export function initNewsFilter() {
  document.querySelectorAll("[data-news-filter]").forEach((root) => {
    const fields = [...root.querySelectorAll("[data-news-field]")];
    const search = root.querySelector("[data-news-search]");
    // a card holds its category in data-news-tag, and its stages and years as data-news-age / data-news-year, split on |
    const valuesOf = (card, field) => (card.dataset[field === "category" ? "newsTag" : `news${field[0].toUpperCase()}${field.slice(1)}`] || "").split("|");
    const empty = root.querySelector("[data-news-empty]");
    const filter = filterable([...root.querySelectorAll("[data-news-tag]")], () => window.Anim?.refresh());
    let typing = null;
    const apply = () => {
      clearTimeout(typing);
      const term = search.value.trim().toLowerCase();
      const count = filter((card) => fields.every((select) => !select.value || valuesOf(card, select.dataset.newsField).includes(select.value)) && card.textContent.toLowerCase().includes(term));
      if (!empty || empty.hidden === count > 0) return;
      empty.hidden = count > 0;
      if (!empty.hidden) gsap.fromTo(empty, { autoAlpha: 0, y: 15 }, { autoAlpha: 1, y: 0, duration: 0.5, delay: 0.3, ease: "power2.out", clearProps: "transform" });
    };
    fields.forEach((select) => select.addEventListener("change", apply));
    // the search waits for a pause in typing, so the grid moves once
    search.addEventListener("input", () => {
      clearTimeout(typing);
      typing = setTimeout(apply, 250);
    });
    root.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      apply();
    });
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

// data-hero-fold: an inner hero gives up this block's text with its top padding mirrored below, or, given a selector, just that part
// with the gap above the block mirrored below it, so they share the first screen (_hero.less)
export function initHeroFold() {
  const sizes = new ResizeObserver((entries) => entries.forEach(({ target, contentBoxSize }) => {
    const block = target.closest("[data-hero-fold]");
    const style = getComputedStyle(block);
    const fold = target === block
      ? contentBoxSize[0].blockSize + 2 * parseFloat(style.paddingTop)
      : target.getBoundingClientRect().bottom - block.getBoundingClientRect().top + 2 * parseFloat(style.marginTop);
    block.previousElementSibling.style.setProperty("--hero-fold", `${fold}px`);
  }));
  document.querySelectorAll("[data-hero-fold]").forEach((block) => {
    if (!block.previousElementSibling?.classList.contains("hero--inner")) return;
    const part = block.dataset.heroFold ? block.querySelector(block.dataset.heroFold) : block;
    if (part) sizes.observe(part);
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

// background videos play muted only while on screen, once their reveal has landed and while their promo isn't
// playing; under reduced motion they hold on their first frame. is-live marks one that has
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
  } else if (!ambientOnScreen.has(video) || video.closest(".is-playing") || revealing(video)) {
    video.pause();
  } else {
    video.play().catch(() => {});
  }
}

// a lazy photo is decoded once it is within a screen of view, so no frame waits on its decode as it scrolls in
export function initEagerPhotos() {
  const photos = Array.from(document.querySelectorAll('img[loading="lazy"]'));
  if (!photos.length) return;
  const near = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
    if (!isIntersecting) return;
    near.unobserve(target);
    target.loading = "eager";
    target.decode().catch(() => {});
  }), { rootMargin: "100% 0px" });
  photos.forEach((img) => near.observe(img));
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
    view.observe(video);
    if (ambientStill.matches) syncAmbient(video);
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
