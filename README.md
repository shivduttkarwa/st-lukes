# St Luke's Grammar School — static cutup

Eleventy + Nunjucks · Bootstrap 5.3 · LESS · `anim`. Output in `dist/` is plain HTML, one CSS and one JS.

```bash
npm install
npm run dev      # http://localhost:3000, live reload; also on the Wi-Fi address it prints, for phones on the same network
npm run build    # production build → dist/
```

The build writes every URL relative to its page, so `dist/` runs from any folder with no prefix, or straight from disk. Pages are flat `<page>.html` files beside `index.html` and `assets/`; the `lab/` pages are only built by `npm run dev`. Staging: stop `npm run dev` first (it rewrites `dist/` while the build runs, and cleans it when it starts), run `npm run build`, then upload the contents of `dist/` to `websites/stlukes/` for https://cim-staging.au/websites/stlukes.

- Rules: `CLAUDE.md`
- Designer's brief: `docs/design-guidelines.md`
- Block field contract: `blocks.yaml`
- Wagtail handoff: `docs/wagtail-handoff.md`
- History: `CHANGELOG.md`
