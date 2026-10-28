# Changelog

## 2026-10-28
- Project scaffolded from the Eleventy starter with the locked rules (see `CLAUDE.md`): Wagtail-shaped blocks, one-direction LESS, fluid root, HtmlBase path prefix, GitHub Pages workflow.
- `anim.js` and the `.qa/` tools taken from the Claremont build; the QA scripts still carry Claremont's 1640 widths and page ids and need re-pointing at 1440 before first use.
- Tokens and type mixins hold placeholder values until the Figma variables and text styles are read.
- `fonts-source/` holds the supplied Poppins, Myriad Pro and Sanshand files (git-ignored); subsetting to woff2 happens in the tokens pass once the weights in use are known.
- Designer's chat brief transcribed to `docs/design-guidelines.md`.
