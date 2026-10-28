# St Luke's Grammar School — static cutup

Eleventy + Nunjucks · Bootstrap 5.3 · LESS · `anim`. Output in `dist/` is plain HTML, one CSS and one JS.

```bash
npm install
npm run dev      # http://localhost:3000, live reload; also on the Wi-Fi address it prints, for phones on the same network
npm run build    # production build → dist/
```

GitHub Pages builds with `PATH_PREFIX=/<repo-name>/` (see `.github/workflows/pages.yml`). To preview that locally use the CLI flag, since Git Bash rewrites a leading-slash env var: `npx eleventy --pathprefix=/st-lukes/`.

- Rules: `CLAUDE.md`
- Designer's brief: `docs/design-guidelines.md`
- Block field contract: `blocks.yaml`
- Wagtail handoff: `docs/wagtail-handoff.md`
- History: `CHANGELOG.md`
