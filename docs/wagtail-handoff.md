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

### Footer (`partials/footer.njk`)
- Site chrome from `site.footer` and `site.socials` (fields in `blocks.yaml` under settings). It has:
  - the portrait logo (the header's `crest.svg` and `wordmark.svg` at 181 wide), and the statement;
  - the intro and Enrol button;
  - the Dee Why and Bayview campus columns (years, address with its line break, Directions, phone numbers as `tel:` links) and the Quick Links;
  - the "Local heart. Global mind." marquee;
  - the white social buttons and affiliation logos;
  - the legal row and the 16px gold strip.
- The marquee is the same `initMarquees()` as the pathways logos (`data-marquee="left"`, right to left at 35 design px/s). Odd phrases are a 2px gold outline, even ones solid gold. It's `aria-hidden` and stands still under reduced motion.
- Figma sets Dee Why's years line in Semibold 16 / 1.4 and Bayview's in Bold 16 / 1.5. The template uses Dee Why's for both (one field), so Bayview's column sits 2px higher than Figma.
- Footer links are plain text links in the inherited white. Quick links are 28px rows under a fine pointer and 44px on touch, and the phone numbers carry an invisible 44px hit area.

## Blocks

### hero (`blocks/hero.njk`)
- Fields in `blocks.yaml`. The background is `image` or `video` (mp4, autoplay muted loop, the image as poster). The image needs renditions at 768, 1280 and 1920 wide for the `srcset`.
- The title is two CharBlocks so the designer's two-line layout (first line flush left, second flush right) holds whatever the words are.
- `notice` is the announcement card: a teaser strip at rest, the full card on hover, focus or tap. It is a hero field for now; move it to a site setting if the client wants to change it without editing the page.
- The header is site chrome (`partials/header.njk`): `site.quick_links` and `site.utility_links` from `site.json`; the logo files are `assets/icons/crest.svg` and `wordmark.svg`.
- Preloader (homepage, `p.preloader`): `base.njk` includes `partials/preloader.njk` (navy layer and rings), and `head.njk` adds `is-preloading` to `<html>` before the first paint unless the reader prefers reduced motion. For review it plays on every load; for launch, add `&& !sessionStorage.getItem("preloader-played")` to that check (in a `try`), which `preloader.js` already sets, so it plays once per session. `preloader.js` carries the hero's own `h1` (it needs a hero block on the page): the rows slide in from the canvas edges to the screen centre, a circle mask opens on the real hero image or video, then the rows move down into place, and just before they land `Anim.init({ after })` plays the header, then the statement and notice. If `main.js` hasn't started it within 5s, the head script drops the class and the page shows normally.

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

### learning (`blocks/learning.njk`)
- "Learning at St Luke's": two title lines (the second a gold outline), prev / next arrows, a slider of Entry Points cards (the same `slider.js` as the USPs) and an outline button.
- Each card is one link: image (`fill-800x1236`, decorative), Figma's shade over the bottom 37%, title, gold meta line, and an optional short `text`. On hover or keyboard focus the text opens under the meta, lifting the title, and the gold arrow fades in (Figma's Normal → Active). The shade stays as it is, as in Figma's Active variant. On touch the arrow is always shown and the text stays closed.
- The outline title here sits on a gradient, so it uses `.outline-text-clear()` (a centred 1px stroke, no fill).

### pathways (`blocks/pathways.njk`)
- "Diverse pathways for every student": two title lines (the second a navy outline on white), a lead, a solid button, and up to two rows of linked logos. Row 1 runs right to left and row 2 left to right (by position, `forloop.counter0|divisibleby:2`), as the brief asks.
- The marquee is `initMarquees()` in `ui.js`. It sizes each logo from its `width` attribute (the design size) on the fluid root, copies the row until the lane can loop seamlessly, and gives every row the same speed (35 design px/s). It pauses on hover and keyboard focus. The copies are `aria-hidden` and out of the tab order. Under reduced motion the rows stand still and wrap.
- Each logo is an image with its name as alt text, linking to the institution's site (`url`). The ADF Careers logo is a Figma SVG export with its 7px caption outlined, so no live text falls under the 12px floor.

### discover (`blocks/discover.njk`)
- The full-width promo ("Discover new ways to thrive"): two title lines (the second a gold outline, centred 1px since it sits on a photo), a lead and up to two buttons, bottom left over a full-bleed image or video with Figma's diagonal navy shade. Below 992 the shade turns vertical and the crop shifts right, so the copy stays readable and the subject stays in frame.
- `video` (optional, the brief's "video or image background"): autoplay muted loop with the image as poster. Background videos carry `data-ambient`; `initAmbientVideos()` holds them on the first frame under reduced motion. The hero's video uses the same attribute.
- New button style `glass` (`.btn-glass`): white at 20% with a 20px background blur, as Figma's frosted button.

### news (`blocks/news.njk`)
- "Latest news and stories": the title on one line (the second half a navy outline) and a "View All News" button (`outline-navy`: gold outline, navy label), then a crossfading feature. Each story is one slide: a royal panel (tags, title, excerpt, "Read Full Story") beside its photo, stacked photo-first below 992. The dots are the slider's pagination, bottom right of the panel.
- Stories should be the newest news pages, not editor-entered (see `blocks.yaml`). Figma shows one story with four dots, so the static build repeats it four times.
- Rotation per the brief: `data-slider-mode="fade" data-slider-autoplay="4000"`. The next story crossfades in (0.9s) 4s after the last one settles. It waits while the feature is off screen, hovered or holding keyboard focus, and doesn't run under reduced motion. The timer is our own in `slider.js`: Swiper's autoplay got stuck when paused from outside mid-fade. The fade needs `swiper/modules/effect-fade.css`, which `main.less` now imports.
- New button styles: `outline-navy`, and `.btn-small` (Myriad Semibold 16, 41 tall under a fine pointer, 44 on touch). Myriad Pro Semibold is now loaded (`myriad-pro-semibold.woff2`, subset like the other weights).

### social (`blocks/social.njk`)
- "Join the conversation": title (second half a navy outline), navy prev / next arrows, a slider of Instagram tiles (352 × 469, the same `slider.js` behaviour as the USPs), and a gold band with the follow line and the site's social buttons (`site.socials`, the same `.social-button()` as the menu).
- The tiles should come from the school's Instagram feed (latest posts, each linking to its post). The static build uses Figma's eight post screenshots, which carry their captions in the image; a live feed would show the post image and caption separately.
- The band runs 38 past the container on the right from 1400 up, as in Figma.

### cta (`blocks/cta.njk`)
- The "Start your St Luke's journey" banner (Figma's CTA Banner component, so likely reused on other pages): two centred Poppins 90 title lines (the second a 2px white outline, centred on the glyph because it sits on moving video), and up to two buttons (Book a Tour gold, Apply to Enrol glass).
- Background: `video` (Figma's is a video fill) as an ambient loop with `data-ambient`, or the `image` alone. Over it are Figma's navy 30% wash and a navy gradient from 56% down, which ends solid navy into the footer.

### placeholder (`blocks/placeholder.njk`)
- Dev-only stand-in for sections not built yet. Not a Wagtail block; drop it from the body when every section exists.

## Content to enter in the admin

- Homepage intro: the promo video. The static build uses the clip from the Figma frame (`assets/video/intro-promo.mp4`: H.264, 1426 × 546, 14.7s, no sound, 15.7 MB). Swap in the full film if the client has one with sound.
- Homepage CTA banner: its background video (a video fill in Figma; only a 720 × 720 preview still could be exported, which is now the poster).
- Homepage pathways: the website address for each of the 16 logos (all `#` for now).
- Homepage learning: short descriptions for Junior School, Senior School, HSC and NAPLAN Results, School Services and Support, and Our Facilities (Figma only has Cottage's). The Senior School card is a video fill in Figma (its still is used; no file yet). The last two cards' meta lines repeat "Pre-K (Ages 3-5)" in Figma, which looks like a placeholder.
- Homepage campuses: the Bayview hover video (a video fill in Figma, no file yet). Dee Why's hover video is the promo clip (`intro-promo.mp4`), the same Figma video. The Bayview detail line reads "210 Headland Road, Dee Why" in Figma: check the address with the client.
- Homepage "Who we are": the Student wellbeing hover video. In Figma that card is a video fill; no file yet, so the card shows its poster only.
