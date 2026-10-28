# St Luke's cutup — rules

Static cutup of the St Luke's Grammar School Figma design, handed on to a Wagtail build. Read `docs/design-guidelines.md` before building any section. `blocks.yaml` is the field contract. These rules override the `figma-to-html` skill where they differ.

Stack: Eleventy 3 + Nunjucks · Bootstrap 5.3 themed only through `--bs-*` · LESS (ITCSS + BEM) · `anim` (Lenis + GSAP, `data-anim-*` only). One CSS, one JS, `dist/` committed. `npm run dev` serves on :3000; `npm run build` before every commit.

## Figma
- File `Ec8NFmOIMTGbBVYbdJcKD9`, page "02 Approved Design Concept" (`20157:4948`), desktop frames at 1440. Frame ids in `docs/figma-frames.md`.
- One section at a time: `get_design_context` + `get_screenshot` for that node, never a whole page frame. Never guess a section; if Figma cannot be read, stop and say so.
- Mobile frames are still to come from the designer. Phone layouts are interpreted until then and must stay easy to replace.

## Templates (Wagtail-shaped)
- One block = `src/_includes/blocks/<block_name>.njk`, reading `value.*` only. Page data `src/_data/pages/<page>.json` = `{ seo, hero, body: [{ type, value }] }`; `partials/stream.njk` renders the body. `p` is the current page's data (`eleventyComputed`).
- Nunjucks subset: `for`, `if`, `include`, `set`, `safe`, `default`. No macros, no filters Django lacks. Loops stagger with `data-anim-group` on the parent, never a hardcoded `data-anim-order` inside a loop.
- Headings bare (`h1`–`h6`, no classes), styled from the parent block. No inline styles, no IDs for styling.
- Images are `{ src, alt, width, height }` rendered through `snippets/image.njk`. One image per slot; `image_mobile` only where the phone design shows a different photo. Video slots are `{ src, poster }`.
- Site chrome (header, footer, menus, quick links) reads `site.json`.
- URLs are root-relative (`/assets/…`); the HtmlBase plugin applies the GitHub Pages prefix at build.

## LESS
- Mobile-first `min-width` only; each property set once per breakpoint. No `max-width` redraw blocks.
- Figma numbers as `60 * @px` (`@px` = 0.0625rem); round fractions to whole px. Tokens live in `_tokens.less` as `:root` custom properties; components use `var(--…)`. LESS does not evaluate maths inside a custom property: a measure that goes into `:root` is a LESS variable first (`@gutter-sm: 20 * @px; --gutter: @gutter-sm;`).
- Type styles are mixins in `02-tools/_type.less`, one per Figma text style; `h1`–`h6` and blocks call them. Never hand-write font-size or line-height in a block.
- One scaling rule: the fluid root in `_base.less` (viewport width and height). No per-value `clamp()`.
- One file per block in `05-components/`, BEM. Bootstrap grid and utilities first; LESS for what they cannot do.
- No comments unless a real gotcha, one line.

## Responsive + accessibility
- Breakpoints sm 576 / md 768 / lg 992 / xl 1200 / xxl 1400; design 1440. Fluid container with one `--gutter`.
- 44px tap targets on touch; compact sizes only under `@fine`; hovers under `(hover: hover)`; form controls 16px; text never under 12px.
- Check each section at 320, 375, 430, 768, 1024, 1280, 1440, 1920 and 667 × 375, then `node .qa/mobile-audit.mjs`.

## Motion
- Only `data-anim-*` (API: `~/.claude/skills/figma-to-html/references/anim-api.md`). Subtle and smooth, nothing quick or bouncy. `prefers-reduced-motion` respected everywhere, marquees and hover videos included.

## Handoff + housekeeping
- `docs/wagtail-handoff.md` is the one living handoff doc; `CHANGELOG.md` holds dated history. Keep history out of this file.
- No people's names in the repo: "the designer", "the client". Commits: one short subject line, no trailers.
- Never: CDNs, Tailwind, editing Bootstrap Sass, hardcoded colours, px anywhere but `@px`, breakpoints, the root and the accessibility floors in `_tokens.less` (44 tap, 16 control text, 12 text).
