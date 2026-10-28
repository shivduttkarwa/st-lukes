# Changelog

## 2026-10-28 — quick links dropdown
- Rebuilt from frame `20169:15240`: the pill itself becomes the white card (radius 26), title and chevron turn navy, the chevron flips up, and the seven links sit 64 below the card's top on a 26 rhythm. The card grows down out of the pill with a clip-path reveal and fades back into it on close; reduced motion drops the transitions.
- Kept anchored to the closed pill (y 30, 234 wide); the Figma open frame draws the card 1px lower and 1px wider, which would make the title jump on open.
- The chevron is the Figma Font Awesome glyph outlined into the sprite, replacing the placeholder stroke. "St Luke’s Portal" takes the curly apostrophe.
- Phone: the card opens wider than the pill when the labels need it, over the logo, with 44px rows; interpreted until the mobile frames arrive.

## 2026-10-28 — main menu
- Menu from frames `20169:15359` (panel) and `20169:15593` (panel with submenu): navy scrim, white panel sliding in from the right (534 wide), search field, Tours / Enquire / Enrol, close button in the burger's spot, nine main rows with the corner arrow, six small links, social buttons. Clicking a row with children widens the panel to the left (967) and shows the submenu column with its thumbnail bottom-right; the thumbnail cross-fades on hover of each child row. Positions measured against Figma within 1px.
- Narrow panel hides the middle utility link, as the design does, so the search pill keeps its 194 width.
- Accessibility: `role="dialog"`, `inert` on the page behind, scroll lock with Lenis stopped, Escape / scrim / close button all close, focus returns to the burger. Reduced motion drops the transitions.
- Phone: full-width panel, submenus as accordions, 44px rows; interpreted until the mobile frames arrive.
- Icons added to the sprite: search, close, corner arrow, Facebook, Instagram, LinkedIn (outlined from the Figma export, no icon font). Burger and close share the `circle-button()` mixin; its hover is now the deeper gold too.
- The search results and "Popular searches" views are not designed yet; the field posts to `/search/?q=`.
- Accessibility floors no longer scale with the root: `@tap-size` is a real 44px, Body 5 has a 12px floor, and form controls use `.type-control()` with a 16px floor (iOS zoom). Header and menu utility links get the invisible `.tap-area()` hit box; quick-links rows, menu rows and social buttons meet 44 on touch, compact only under `@fine`.
- `.qa/mobile-audit.mjs` re-pointed: reads pages over http (root-relative assets), defaults to `index`, and measures a second pass with the menu and submenus open. Clean at 360 / 768 / 1024 apart from the title's intentional 15px bleed.

## 2026-10-28 — homepage hero + header
- Hero block from frames `20169:5668` and `20169:15196`: full-bleed photo with the two Figma gradients, the two-line display title straddling the hero's bottom edge, the statement, and the announcement card (teaser strip at rest, full card on hover/focus/tap). Photo parallax through the CSS view-timeline; title lines enter from left and right, header items settle down, all on the hero tier.
- Header bar: quick-links pill with a simple dropdown panel (the designed panel frame is still to be read), centred royal logo block, Tours / Enquire / Enrol, gold menu button. Below lg the labels hide; the menu panel itself is not built yet.
- Phone and tablet layouts are interpreted: statement, strip and title stack at the hero's foot. Replace when the mobile frames arrive.
- `anim.js` gains `enter-left` and `drop-soft` (a non-overshooting header entrance, per the designer's "nothing bouncing").
- `coming-soon` dev block holds the space below the hero.
- Hero height is the Figma proportion (813 at 1440) capped so the second title line clears the fold on 16:9 screens: `min(56.46vw, 100svh − 113px)`. Not `aspect-ratio` + `max-height`: a max in one axis transfers through the ratio and narrows the box.
- Announcement card checked against the hover component `20195:15969` and the "Announcement Popup" frame `20169:15196` by pixel comparison: strip and card re-anchored (strip 67 from the hero foot, card 35 below it), title lines and statement now land on Figma's ink rows within 1px. `text-box: trim-both` came off the title lines — the overhang maths is built on line boxes.
- Letter-spacing in `_type.less` was read as px; Figma's text-style numbers are percent (Body 3 −1 = −0.16px at 16px). All style-derived values corrected to `em` percentages; Body 3 line-height is 1.4.
- `.btn` sizes were written as `--bs-btn-*: 16 * @px`, which LESS leaves unevaluated inside a custom property, so Bootstrap's defaults applied. Now LESS variables first.
- Solid button hover is a deeper gold (`--color-gold-deep`, gold mixed with 10 % black) with the arrow nudging up-right; the white hover vanished on the white announcement card.
- The fluid root now also scales by viewport height: `clamp(14px, min(0.5rem + 0.5556vw, 0.4rem + 1.2svh), 18.67px)`. 16px at the design's 1440 × 813 first view; a 1280 × 584 laptop viewport (1920 × 1080 at 150 %) drops to 14px so the whole hero sits inside the fold.

## 2026-10-28 — tokens
- Colours, fonts, font sizes and every text style read from the Figma variables (page frames Homepage, Extra Blocks, Our School Landing, Contact) into `_tokens.less` and `_type.less`. Mixin names follow Figma: `type-h1…h5` are the Poppins styles, `type-heading-2…6` the Sanshand ones, `type-body-1…5` Myriad Pro, `type-display-1…4` the Poppins display sizes.
- Phone sizes in `_type.less` are interpreted; replace when the mobile frames arrive.
- Fonts subset to woff2 (Latin range) from `fonts-source/`: Poppins ExtraBold, Myriad Pro Regular and Bold, Sanshand Filled. Add a weight only when a Figma style uses it.
- Button variants from the "Button Solid" / "Button Outline" components in `_buttons.less`, themed through `--bs-btn-*`.
- Figma has no spacing or breakpoint variables; `--gutter` and the 1240 content width are measured from the frames (100 side margins at 1440).

## 2026-10-28 — scaffold
- Project scaffolded from the Eleventy starter with the locked rules (see `CLAUDE.md`): Wagtail-shaped blocks, one-direction LESS, fluid root, HtmlBase path prefix, GitHub Pages workflow.
- `anim.js` and the `.qa/` tools taken from the Claremont build; the QA scripts still carry Claremont's 1640 widths and page ids and need re-pointing at 1440 before first use.
- Tokens and type mixins hold placeholder values until the Figma variables and text styles are read.
- `fonts-source/` holds the supplied Poppins, Myriad Pro and Sanshand files (git-ignored); subsetting to woff2 happens in the tokens pass once the weights in use are known.
- Designer's chat brief transcribed to `docs/design-guidelines.md`.
