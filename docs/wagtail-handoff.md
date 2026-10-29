# Wagtail handoff

Living document. Updated as blocks land; the Wagtail build reads this, `blocks.yaml` and `src/_includes/blocks/`.

## How the static build maps to Wagtail

| Static | Wagtail |
|---|---|
| `src/_includes/blocks/<name>.njk` | `templates/blocks/<name>.html`, the block template |
| `value.<field>` | `value.<field>` (same) |
| `{{ value.text \| safe }}` | `{{ value.text\|richtext }}` |
| `{% set img = value.image %}{% include "snippets/image.njk" %}` | `{% image value.image fill-WxH %}` |
| `{% include "snippets/button.njk" %}` | `{% include "snippets/button.html" with btn=… %}` |
| `partials/stream.njk` loop | `{% for block in page.body %}{% include_block block %}{% endfor %}` |
| `src/_data/pages/<page>.json` | the page's fields + StreamField |
| `src/_data/site.json` | site settings and snippets |
| `blocks.yaml` | the StreamField block definitions |
| `dist/assets/css/main.css`, `dist/assets/js/main.js` | copied as-is into the Wagtail static files; never edited there |

Nunjucks → Django differences to expect: `loop.index0` → `forloop.counter0`, `{% else %}` in a `for` → `{% empty %}`, `{% set %}` → `{% with %}`.

## Site chrome

### Header and menu (`partials/header.njk`, `partials/menu.njk`)
- `site.nav` is the page tree: top-level pages in menu order; `children` are each page's live children, shown in the submenu when the parent row is clicked. A parent with no children renders as a plain link (arrow ↗); with children it is a `<button aria-expanded>` (arrow turns ↘ when open). The parent page itself is not linked in the design; add it as the first child ("Overview") if the client wants it reachable from the menu.
- `children[].image` is the submenu thumbnail — a page field (e.g. `menu_image`), fall back to the page's hero image. The template only writes its URL on each child link as `data-thumb`; there is one shared, decorative `<div class="menu__thumb" aria-hidden="true">` after the nav, and the script fills it. Opening a submenu shows its first child's image; switching to another top-level row cross-fades to that row's first child; hovering or focusing a child swaps to its image. The first child carries `is-current` (Nunjucks `loop.first` → Django `forloop.first`) and the script moves it with the image.
- `site.menu_links` (six small links), `site.utility_links` (Tours / Enquire / Enrol, shown in the header and again inside the panel), `site.socials` (`network` is the sprite icon id) and `site.quick_links` are site settings.
- The search field posts `GET /search/?q=`. The results view (rows with thumbnail + title + description, "Popular searches" on the right) is described in `docs/design-guidelines.md` but not designed or built yet.
- Behaviour lives in `ui.js` (`initMenu`): overlay + panel slide in, panel widens to the left when a submenu opens, `inert` on the rest of the page, scroll lock with Lenis stopped, Escape and overlay click close, focus returns to the burger. The dialog role sits on the `.menu` root. The burger and close icons are a CSS `.menu-icon` (no sprite icon). On desktop it sets `--menu-zoom` so the panel fits the window height, and it numbers each list's children (`--i`) for the entrance stagger. Copy `main.js` as-is.
- Below `lg` the panel is full width and submenus open as accordions; the thumbnail is hidden. Phone layout is interpreted until the designer's mobile frames arrive.

## Blocks

### hero (`blocks/hero.njk`)
- Fields in `blocks.yaml`. The background is `image` or `video` (mp4, autoplay muted loop, the image as poster). The image needs renditions at 768, 1280 and 1920 wide for the `srcset`.
- The title is two CharBlocks so the designer's two-line layout (first line flush left, second flush right) holds whatever the words are.
- `notice` is the announcement card: a teaser strip at rest, the full card on hover, focus or tap. It is a hero field for now; move it to a site setting if the client wants to change it without editing the page.
- The header is site chrome (`partials/header.njk`): `site.quick_links` and `site.utility_links` from `site.json`; the logo files are `assets/icons/crest.svg` and `wordmark.svg`.

### intro (`blocks/intro.njk`)
- The navy band under the hero: the statement and a button on the left; the portrait photo and an outline button on the right, flush to the window edge; the promo video below the statement, flush to the left edge. Fields in `blocks.yaml`. Below 992 it stacks in that order (statement, video, photo); phone layout interpreted.
- `statement` is one rich-text paragraph. Its line break before "on Sydney’s Northern Beaches" only applies from 992 up, where the measure matches the design, so keep a space before it.
- These two buttons have no arrow: the template sets `plain` before the button include (`{% include "snippets/button.html" with btn=value.button plain=True %}`).
- `promo.video` (mp4) plays inline with native controls when the pill is pressed, and returns to the poster when it ends. Without a video the pill is a disabled button.
- Renditions: photo `fill-1016x818` (shown 508 × 409), poster `fill-821x514` or larger.

### pillars (`blocks/pillars.njk`, card markup in `snippets/pillar-card.njk`)
- "Who we are": eyebrow, Heading 2 title, and a collage of four cards (Local heart, Academic excellence, Student wellbeing, Global mind). The collage is drawn for exactly four, so `cards` is `min_num=4, max_num=4`.
- The template renders two columns from the one list: cards 1 and 3 on the left, 2 and 4 on the right (`loop.index0 % 2` → `forloop.counter0|divisibleby:2`). Each card carries `pillars__card--{{ loop.index }}` (`forloop.counter`), which sets its image shape and width. Below 768 the columns dissolve and the cards return to 1–4 order.
- Each image sits in a parallax layer 10% taller than its frame (it drifts ±5% as the card passes), so renditions are the layer's shape: `fill-1232x902`, `fill-818x1199`, `fill-818x1131`, `fill-1234x895` for cards 1–4. Add a `srcset` with half-width renditions; the 768 audit flags card 1 as 1.8× wider than its slot.
- `video` (optional mp4) plays muted over the image while the pointer is on the card, fading in over 0.6s, and resets once it has faded out. Mouse and trackpad only, never on touch, never under reduced motion.
- `logo` (optional) sits beside the text at 70 × 70: the Round Square mark on Global mind (`assets/images/home/round-square.svg`).
- A line break typed in `text` applies from 1200 up, where the card measure matches the design; below that it reads as a space.

### stats (`blocks/stats.njk`)
- A list of statistics and an outline button. Each item: `value` as displayed ("1200+", "99%", ">35"), `label`, and `ring`, the share of the circle the white arc draws (0–100). Two per row from 1200 up, one per row below.
- Motion lives in `anim.js` (`data-anim="counter"`): as each item scrolls in, the first number in its value counts up from 0 (prefix and suffix kept, commas kept if typed) while its ring draws clockwise from 12 o'clock to `ring`. It takes 2s, 0.1s apart in list order (`data-anim-order="{{ loop.index0 }}"` → `{{ forloop.counter0 }}`). The ring's final value is the circle's `stroke-dasharray` attribute, so without JS or under reduced motion the finished state shows.
- The ring is inline SVG from the Figma geometry: outer 100, stroke 12.88, white track at 40%.

### usps (`blocks/usps.njk`, card markup in `snippets/usp-card.njk`)
- "Why choose St Luke's Grammar": eyebrow, Heading 2 title, up to two buttons (`style` primary or outline, no arrow), prev / next arrows, and the USP cards in a Swiper slider. Behind them a navy-to-royal band, then the `background` image full-bleed with the Figma shade over it. The image starts 146 above the cards, so it holds its place whatever the heading's length.
- Slider: `slider.js` (`initSliders()`) turns any `[data-slider]` into a Swiper with `slidesPerView: "auto"`, keyboard and a11y on, 900ms slides on `--ease-out` (0 under reduced motion). The arrows are found inside the nearest `[data-slider-scope]`. `data-slider-gap` is the gap in design px, scaled with the fluid root. The track starts on the container edge and stays `overflow: visible`, so cards run off the left of the window as it moves, as the brief asks. The last card stops on the container's right edge.
- Each card: square image (`fill-800x800`), title, text (a typed line break applies from 768 up), the gold link bar. An optional `video` plays muted on hover, as on the "Who we are" cards. The bodies are at least 176 tall, so the gold bars line up.

### campuses (`blocks/campuses.njk`)
- "Two campuses / one school": two title lines (the second drawn as a gold outline), up to two outline buttons, a rich-text lead, and two campus cards side by side from 992 (stacked below).
- Each card is one link: image (`fill-1234x820`, decorative), shade, name, detail, and a gold arrow. From the prototype's hover state (`Bayview / Dee Why Campus Animation`): on hover the video plays over the image and the arrow fades in. On touch the arrow is always shown, and the video never plays.
- The outline title uses `-webkit-text-stroke` with a navy fill painted over it (`paint-order: stroke fill`), which leaves Figma's 1px outside stroke. It assumes the navy background.

### placeholder (`blocks/placeholder.njk`)
- Dev-only stand-in for sections not built yet. Not a Wagtail block; drop it from the body when every section exists.

## Content to enter in the admin

- Homepage intro: the promo video. The static build uses the clip from the Figma frame (`assets/video/intro-promo.mp4`: H.264, 1426 × 546, 14.7s, no sound, 15.7 MB). Swap in the full film if the client has one with sound.
- Homepage campuses: the Bayview hover video (a video fill in Figma, no file yet). Dee Why's hover video is the promo clip (`intro-promo.mp4`), the same Figma video. The Bayview detail line reads "210 Headland Road, Dee Why" in Figma: check the address with the client.
- Homepage "Who we are": the Student wellbeing hover video. In Figma that card is a video fill; no file yet, so the card shows its poster only.
