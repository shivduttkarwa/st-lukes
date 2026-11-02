const normal = (text) => text.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();

// The rows are rendered into a <template> at build time and filtered here; in Wagtail the same <li> markup comes from the search view.
export function initMenuSearch(menu, { closeItems, syncWide }) {
  const form = menu.querySelector("[data-search]");
  const source = menu.querySelector("[data-search-index]");
  if (!form || !source) return { close() {} };
  const input = form.querySelector("input");
  const clear = form.querySelector("[data-search-clear]");
  const list = menu.querySelector("[data-search-list]");
  const status = menu.querySelector("[data-search-status]");
  const body = menu.querySelector(".menu__body");
  const rows = [...source.content.children].map((row) => ({
    row,
    title: normal(row.querySelector(".menu__result-title").textContent),
    text: normal(row.textContent),
  }));

  const run = () => {
    const query = normal(input.value);
    menu.classList.toggle("has-query", !!query);
    clear.hidden = !query;
    if (!query) {
      list.replaceChildren();
      status.textContent = "";
      return;
    }
    const terms = query.split(" ");
    const found = rows
      .filter(({ text }) => terms.every((term) => text.includes(term)))
      .sort((a, b) => Number(b.title.includes(query)) - Number(a.title.includes(query)));
    list.replaceChildren(...found.map(({ row }) => row));
    const shown = input.value.trim();
    status.textContent = found.length
      ? `${found.length} result${found.length === 1 ? "" : "s"} for “${shown}”`
      : `No results for “${shown}”. Try a popular search.`;
    list.scrollTop = 0;
    body.scrollTop = 0;
  };

  const open = () => {
    if (menu.classList.contains("is-searching")) return;
    menu.classList.add("is-searching");
    closeItems();
    syncWide();
  };

  const close = () => {
    menu.classList.remove("is-searching");
    input.value = "";
    run();
    syncWide();
  };

  input.addEventListener("focus", open);
  input.addEventListener("input", () => {
    open();
    run();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !input.value) return;
    e.stopPropagation();
    input.value = "";
    run();
  });
  clear.addEventListener("click", () => {
    input.value = "";
    run();
    input.focus();
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    run();
    list.querySelector("a")?.focus();
  });
  return { close };
}
