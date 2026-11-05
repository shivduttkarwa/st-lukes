import { liquidGlass } from "./glass.js";

const TYPEAHEAD_RESET = 500;

const faceOf = (control) => control.closest("[data-select]")?.querySelector("[role='combobox']") || control;

// Keeps the native <select> for the value, the form post and validation; the listbox built here is only its face.
function buildSelect(root, index) {
  const select = root.querySelector("select");
  if (!select) return;
  const id = select.id || `select-${index}`;
  const options = [...select.options].filter((option) => !option.hidden);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "select__toggle";
  toggle.setAttribute("role", "combobox");
  toggle.setAttribute("aria-haspopup", "listbox");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", `${id}-list`);
  if (select.hasAttribute("aria-describedby")) toggle.setAttribute("aria-describedby", select.getAttribute("aria-describedby"));

  const label = select.id && document.querySelector(`label[for="${select.id}"]`);
  if (label) {
    label.id ||= `${id}-label`;
    toggle.setAttribute("aria-labelledby", label.id);
    label.addEventListener("click", (e) => {
      e.preventDefault();
      toggle.focus();
    });
  } else {
    toggle.setAttribute("aria-label", select.getAttribute("aria-label") || "");
  }

  const value = document.createElement("span");
  value.className = "select__value";
  toggle.append(value);
  const icon = root.querySelector(".icon");
  if (icon) toggle.append(icon);

  const menu = document.createElement("div");
  menu.className = "select__menu";
  const list = document.createElement("ul");
  list.className = "select__list";
  list.id = `${id}-list`;
  list.setAttribute("role", "listbox");
  list.setAttribute("data-lenis-prevent", "");
  const rows = options.map((option, i) => {
    const row = document.createElement("li");
    row.className = "select__option";
    row.id = `${id}-option-${i}`;
    row.setAttribute("role", "option");
    if (!option.value && i === 0) row.classList.add("select__option--all");
    row.textContent = option.textContent;
    const check = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    check.setAttribute("class", "select__check");
    check.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#icon-check");
    check.append(use);
    row.append(check);
    list.append(row);
    return row;
  });

  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");
  const bar = document.createElement("span");
  bar.className = "select__bar";
  bar.setAttribute("aria-hidden", "true");
  const thumb = document.createElement("span");
  thumb.className = "select__thumb";
  bar.append(thumb);
  menu.append(list, bar);
  const shade = document.createElement("span");
  shade.className = "select__shade";
  root.append(toggle, shade, menu);
  root.classList.add("is-ready");
  root.style.setProperty("--select-head", `${toggle.offsetHeight}px`);

  let active = 0;
  let typed = "";
  let typedAt = 0;
  const isOpen = () => root.classList.contains("is-open");
  // a list taller than the menu scrolls under a slim bar of our own, in a gutter inside the glass, clear of its corners
  const edges = () => {
    const room = list.scrollHeight - list.clientHeight;
    menu.classList.toggle("has-scroll", room > 1);
    if (room <= 1) return;
    const track = bar.clientHeight;
    const size = Math.max(28, (track * list.clientHeight) / list.scrollHeight);
    thumb.style.height = `${size}px`;
    thumb.style.transform = `translateY(${((track - size) * list.scrollTop) / room}px)`;
  };
  list.addEventListener("scroll", edges, { passive: true });
  thumb.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    thumb.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const startTop = list.scrollTop;
    const ratio = (list.scrollHeight - list.clientHeight) / Math.max(1, bar.clientHeight - thumb.offsetHeight);
    const move = (ev) => { list.scrollTop = startTop + (ev.clientY - startY) * ratio; };
    const up = () => {
      bar.classList.remove("is-dragging");
      thumb.removeEventListener("pointermove", move);
      thumb.removeEventListener("pointerup", up);
      thumb.removeEventListener("pointercancel", up);
    };
    bar.classList.add("is-dragging");
    thumb.addEventListener("pointermove", move);
    thumb.addEventListener("pointerup", up);
    thumb.addEventListener("pointercancel", up);
  });
  bar.addEventListener("pointerdown", (e) => {
    if (e.target !== bar) return;
    e.preventDefault();
    const box = bar.getBoundingClientRect();
    const share = (e.clientY - box.top - thumb.offsetHeight / 2) / Math.max(1, box.height - thumb.offsetHeight);
    list.scrollTo({ top: Math.max(0, Math.min(1, share)) * (list.scrollHeight - list.clientHeight), behavior: "smooth" });
  });

  const sync = () => {
    const current = select.options[select.selectedIndex];
    value.textContent = current ? current.textContent : "";
    value.classList.toggle("is-placeholder", !select.value);
    rows.forEach((row, i) => row.setAttribute("aria-selected", String(options[i] === current)));
  };

  const setActive = (i) => {
    active = Math.max(0, Math.min(rows.length - 1, i));
    rows.forEach((row, n) => row.classList.toggle("is-active", n === active));
    if (rows[active]) toggle.setAttribute("aria-activedescendant", rows[active].id);
    const row = rows[active];
    if (!row) return;
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
  };

  const open = (start) => {
    if (isOpen()) return;
    const box = toggle.getBoundingClientRect();
    const below = window.innerHeight - box.bottom;
    // the menu takes its side while folded, with no transition, so it unfolds from the toggle and not from where it last was
    menu.style.transition = shade.style.transition = "none";
    root.classList.toggle("is-above", below < menu.offsetHeight && box.top > below);
    // a list wider than its toggle lines up with the toggle's right edge where it would cross the page gutter
    const gutter = parseFloat(getComputedStyle(root.closest(".container") || document.body).paddingRight) || 0;
    root.classList.toggle("is-end", box.left + menu.offsetWidth > document.documentElement.clientWidth - gutter);
    edges();
    root.style.setProperty("--select-head", `${toggle.offsetHeight}px`);
    liquidGlass(menu, shade);
    void menu.offsetWidth;
    menu.style.transition = shade.style.transition = "";
    root.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    setActive(start ?? Math.max(0, options.indexOf(select.options[select.selectedIndex])));
  };

  const close = () => {
    if (!isOpen()) return;
    root.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.removeAttribute("aria-activedescendant");
  };

  const choose = (i) => {
    const option = options[i];
    if (!option) return;
    if (select.value !== option.value) {
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    sync();
  };

  const typeahead = (key) => {
    const now = Date.now();
    typed = now - typedAt > TYPEAHEAD_RESET ? key : typed + key;
    typedAt = now;
    const match = options.findIndex((option) => option.textContent.trim().toLowerCase().startsWith(typed));
    if (match < 0) return;
    if (isOpen()) setActive(match);
    else open(match);
  };

  const MOVES = {
    ArrowDown: () => active + 1,
    ArrowUp: () => active - 1,
    Home: () => 0,
    End: () => rows.length - 1,
    PageDown: () => active + 5,
    PageUp: () => active - 5,
  };

  toggle.addEventListener("click", () => {
    if (isOpen()) return close();
    open();
    // a pointer opens the menu with nothing highlighted, as Apple's do; the arrow keys still start from the chosen row
    rows.forEach((row) => row.classList.remove("is-active"));
  });
  toggle.addEventListener("blur", close);
  toggle.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      if (isOpen()) {
        choose(active);
        close();
      }
      return;
    }
    if (e.key === "Escape") {
      if (isOpen()) {
        e.stopPropagation();
        close();
      }
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isOpen()) {
        choose(active);
        close();
      } else {
        open();
      }
      return;
    }
    if (MOVES[e.key]) {
      e.preventDefault();
      if (!isOpen()) open();
      else setActive(MOVES[e.key]());
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) typeahead(e.key.toLowerCase());
  });

  // the list never takes focus, so the toggle's blur only fires when the reader really leaves
  menu.addEventListener("mousedown", (e) => e.preventDefault());
  list.addEventListener("pointermove", (e) => {
    const i = rows.indexOf(e.target.closest("[role='option']"));
    if (i > -1 && !rows[i].classList.contains("is-active")) {
      active = i;
      rows.forEach((row, n) => row.classList.toggle("is-active", n === i));
    }
  });
  list.addEventListener("click", (e) => {
    const i = rows.indexOf(e.target.closest("[role='option']"));
    if (i < 0) return;
    choose(i);
    close();
    toggle.focus();
  });
  document.addEventListener("click", (e) => {
    if (!root.contains(e.target)) close();
  });

  select.addEventListener("change", sync);
  select.form?.addEventListener("reset", () => setTimeout(sync));
  sync();
}

export function initSelects() {
  document.querySelectorAll("[data-select]").forEach(buildSelect);
}

// Messages come from data-error (empty) and data-invalid (wrong format) on each control. An action of "#" means there is
// nowhere to post yet, so a valid form just shows its success note.
export function initForms() {
  document.querySelectorAll("form[data-validate]").forEach((form) => {
    form.noValidate = true;
    const controls = [...form.elements].filter((control) => control.matches("input, select, textarea") && control.willValidate);
    const success = form.querySelector("[data-form-success]");

    const messageFor = (control) => {
      if (control.required && !control.value.trim()) return control.dataset.error || control.validationMessage;
      return control.validity.valid ? "" : control.dataset.invalid || control.dataset.error || control.validationMessage;
    };

    const check = (control) => {
      const text = messageFor(control);
      const error = document.getElementById(control.getAttribute("aria-describedby"));
      control.closest("[data-field]")?.classList.toggle("has-error", !!text);
      if (text) faceOf(control).setAttribute("aria-invalid", "true");
      else faceOf(control).removeAttribute("aria-invalid");
      if (error) {
        error.textContent = text;
        error.hidden = !text;
      }
      return !text;
    };

    const hasError = (control) => control.closest("[data-field]")?.classList.contains("has-error");

    controls.forEach((control) => {
      const recheck = () => {
        if (hasError(control)) check(control);
      };
      control.addEventListener("input", recheck);
      control.addEventListener("change", () => check(control));
      control.addEventListener("blur", () => {
        if (control.value) check(control);
      });
    });

    form.addEventListener("submit", (e) => {
      if (success) success.hidden = true;
      const invalid = controls.filter((control) => !check(control));
      if (invalid.length) {
        e.preventDefault();
        faceOf(invalid[0]).focus();
        window.Anim?.refresh();
        return;
      }
      if (form.getAttribute("action") !== "#") return;
      e.preventDefault();
      form.reset();
      if (success) success.hidden = false;
      window.Anim?.refresh();
    });
  });
}
