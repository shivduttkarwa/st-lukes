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
    row.textContent = option.textContent;
    list.append(row);
    return row;
  });

  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");
  root.append(toggle, list);
  root.classList.add("is-ready");

  let active = 0;
  let typed = "";
  let typedAt = 0;
  const isOpen = () => root.classList.contains("is-open");

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
    root.classList.toggle("is-above", below < list.scrollHeight && box.top > below);
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

  toggle.addEventListener("click", () => (isOpen() ? close() : open()));
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
  list.addEventListener("mousedown", (e) => e.preventDefault());
  list.addEventListener("pointermove", (e) => {
    const i = rows.indexOf(e.target.closest("[role='option']"));
    if (i > -1 && i !== active) {
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
