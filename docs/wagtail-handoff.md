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
| `dist/assets/css/main.css`, `dist/assets/js/main.js`, from `npm run build` | copied as-is into the Wagtail static files; never edited there |

Nunjucks → Django differences to expect: `loop.index0` → `forloop.counter0`, `{% else %}` in a `for` → `{% empty %}`, `{% set %}` → `{% with %}`.

## Site chrome

### Header and menu (`partials/header.njk`, `partials/menu.njk`)
- `site.nav` is the page tree: top-level pages in menu order; `children` are each page's live children, shown in the submenu when the parent row is clicked. A parent with no children renders as a plain link (arrow ↗); with children it is a `<button aria-expanded>` (arrow turns ↘ when open). The parent page itself is not linked in the design; add it as the first child ("Overview") if the client wants it reachable from the menu.
- For the demo, the Home submenu in `site.nav` lists every built page. It is review-only: replace it once the page tree drives the menu.
- `children[].image` is the submenu thumbnail — a page field (e.g. `menu_image`), fall back to the page's hero image. The template only writes its URL on each child link as `data-thumb`; there is one shared, decorative `<div class="menu__thumb" aria-hidden="true">` after the nav, and the script fills it. Opening a submenu shows its first child's image; switching to another top-level row cross-fades to that row's first child; hovering or focusing a child swaps to its image. The first child carries `is-current` (Nunjucks `loop.first` → Django `forloop.first`) and the script moves it with the image.
- `site.menu_links` (six small links), `site.utility_links` (Tours / Enquire / Enrol, shown in the header and again inside the panel), `site.socials` (`network` is the sprite icon id), `site.quick_links_label` (the toggle's text) and `site.quick_links` are site settings.
- The sticky header is `initStickyHeader()` in `ui.js`. It toggles `is-stuck` (fixed), `is-compact` (the navy strip with the hanging logo, beyond one header-height from the top), `is-hidden` (scrolling down) and `is-held` (GPU layers, from the first time it sticks) on `.site-header`. CSS transitions do the rest. Keep the `site-header__brand` wrapper around the logo. The entrance animation must target the outer cells and the compact bar the elements inside them, or GSAP bakes the bar's CSS moves into inline transforms. It has no CMS fields and needs nothing beyond copying `main.js` and the CSS.
- `initPlatform()` in `ui.js` adds `is-windows-chrome` to `<html>` on Chrome and Edge on Windows, and `_text-thin.less` then applies the `text-thin` filters from `partials/icons.njk` to white and gold Sanshand text (`text-thin-crisp`, a table curve, on the header row: Tours, Enquire, Enrol and the Quick Links label). They work on live text, so any wording set in Wagtail gets them. Keep `partials/icons.njk` in the base template. The Quick Links label `<span>` also carries `data-label` with the same text: on Windows Chrome a filtered white copy in its `::after` cross-fades with the navy open-state label, so keep the attribute in the template. A split title carries the filter on its `.anim-line`s while they play, because on the parent it clips their rise and delays their fade.
- Search is built from the designer's brief; Figma draws no results state. Focusing the field widens the panel and shows `site.popular_searches` in the submenu's place; typing swaps the main list for result rows (thumbnail, title, short description). `search.js` (`initMenuSearch`) filters rows rendered into a `<template data-search-index>` from `_data/search_index.js`: the built pages, the news stories, and menu-only pages with their section as the description. In Wagtail, drop the template and fetch the same `<li>` markup from a search view inside `run()`, using `search_description` for the text and a `fill-192x144` rendition for the thumbnail (the static build cuts these with `.qa/search-thumbs.py`). The form already points at `GET /search/?q=`, but the script intercepts it until then. `site.popular_searches` are plain links straight to their pages (label + url), and the client chooses which pages to list.
- Behaviour lives in `ui.js` (`initMenu`): overlay + panel slide in, panel widens to the left when a submenu opens, `inert` on the rest of the page, scroll lock with Lenis stopped, Escape and overlay click close, focus returns to the burger. The dialog role sits on the `.menu` root. The burger and close icons are a CSS `.menu-icon` (no sprite icon). On desktop it sets `--menu-zoom` so the panel fits the window height, and it numbers each list's children (`--i`) for the entrance stagger. Copy `main.js` as-is.
- The menu header never scrolls: from `lg` only the result rows scroll while search results show, and below `lg` everything under the header scrolls. The panel carries `data-lenis-prevent`, because Lenis, stopped while the menu is open, otherwise cancels wheel and touch scrolling inside it.
- Below `lg` the panel is full width and submenus open as accordions; the thumbnail is hidden. Phone layout is interpreted until the designer's mobile frames arrive.

### Footer (`partials/footer.njk`)
- Site chrome from `site.footer` and `site.socials` (fields in `blocks.yaml` under settings). It has:
  - the portrait logo (the header's `crest.svg` and `wordmark.svg` at 181 wide), and the statement;
  - the intro and Enrol button;
  - the Dee Why and Bayview campus columns (years, address with its line break, Directions, phone numbers as `tel:` links) and the Quick Links;
  - the "Local heart. Global mind." marquee;
  - the white social buttons and affiliation logos;
  - the legal row and the 16px gold strip.
- The marquee is the same `initMarquees()` as the pathways logos (`data-marquee="left"`, right to left at 35 design px/s). Odd phrases are a hollow 2px gold outline outside the glyph (`.outline-text-clear()`), even ones solid gold. The lane carries 3px of padding so its overflow doesn't clip the outline. It's `aria-hidden` and stands still under reduced motion.
- Figma sets Dee Why's years line in Semibold 16 / 1.4 and Bayview's in Bold 16 / 1.5. The template uses Dee Why's for both (one field), so Bayview's column sits 2px higher than Figma.
- Footer links are plain text links in the inherited white. Quick links are 28px rows under a fine pointer and 44px on touch, and the phone numbers carry an invisible 44px hit area.

## Blocks

### hero (`blocks/hero.njk`)
- Fields in `blocks.yaml`. The background is `image` or `video` (mp4, autoplay muted loop, the image as poster). The image needs renditions at 768, 1280 and 1920 wide for the `srcset`.
- The title is two CharBlocks so the designer's two-line layout (first line flush left, second flush right) holds whatever the words are.
- `notice` is the announcement card: a teaser strip at rest, the full card on hover, focus or tap. It is a hero field for now; move it to a site setting if the client wants to change it without editing the page.
- The header is site chrome (`partials/header.njk`): `site.quick_links` and `site.utility_links` from `site.json`; the logo files are `assets/icons/crest.svg` and `wordmark.svg`.
- Preloader (homepage, `p.preloader`): `base.njk` includes `partials/preloader.njk` (navy layer and rings), and `head.njk` adds `is-preloading` to `<html>` before the first paint unless the reader prefers reduced motion. While the build is being reviewed it only plays with `?preloader` in the address. For launch, replace that test with `!sessionStorage.getItem("preloader-played")` (in a `try`), which `preloader.js` already sets, so it plays once per session. `preloader.js` carries the hero's own `h1` (it needs a hero block on the page): the rows slide in from the canvas edges to the screen centre, a circle mask opens on the real hero image or video, then the rows move down into place, and just before they land `Anim.init({ after })` plays the header, then the statement and notice. If `main.js` hasn't started it within 5s, the head script drops the class and the page shows normally.

### page_hero (`blocks/page_hero.njk`)
- The landing-page hero (Our School): the homepage hero's frame, height, shade, header and Display 1 title, through the same `.hero` styles with a `hero--page` modifier. Fields in `blocks.yaml`.
- The title rows sit inset rather than bleeding: line 1 starts 92 in, line 2 ends 66 in. Both slide in from the canvas edges like the homepage title (`enter-left` / `enter-right`), then the header comes in and the eyebrow fades up.
- The eyebrow (Heading 5) keeps its spaces as typed (`white-space: pre`); Figma has two between "Our" and "School".
- The image is drawn at Figma's crop (118.33% × 119.47% of the frame at −8.33%, −0.73%), so renditions are that shape: 1900 × 1083 here (`fill-1900x1083`, plus 1280 and 768 for the `srcset`). It has no parallax, because the crop leaves no photo above the frame for it to move into.

### collage (`blocks/collage.njk`)
- The navy band under a landing-page hero: statement and button, portrait, video with its play pill, stat circle, quote and Instagram tile. Fields in `blocks.yaml`. Below 992 it stacks; phone layout interpreted.
- The portrait's parallax moves the whole frame ±5% (`.collage__layer`), not the photo inside it, because Figma's crop fills the source's full height and leaves nothing to travel into. Rendition `fill-810x1004`.
- The video plays as the homepage intro's does (see `intro`), as the designer asked for this collage: muted on a loop behind the play pill once it is on screen.
- The stat counts up through `data-anim="counter"`. The curved caption is inline SVG text on a circle path.
- The tile's foot is covered by whatever follows it, as in Figma: 2px by `page_links`, 1px by `feature_rows`. The following block needs `position: relative` to paint over it.

### page_links (`blocks/page_links.njk`)
- Child-page cards, two per row from 768 up. Each card is one link; on hover the optional `text` opens, the shade deepens and the gold arrow fades in. On touch the arrow is always shown and the text stays closed. An optional `video` plays muted on hover.

### feature_rows (`blocks/feature_rows.njk`)
- The Alternative landing page's alternating rows: a photo flush to the window edge beside a heading, copy and a solid button. Odd rows have the photo on the left and even rows on the right, by position (`loop.index % 2` → `forloop.counter|divisibleby:2`), through CSS and the glide direction only. Below 992 each row stacks with the photo first; phone layout interpreted.
- The photo glides in from its own side (`data-anim-scroll="timed"`), the heading and copy reveal line by line, and the button fades up. There's no parallax, because Figma's crops fill the source's height.

### inner_hero (`blocks/inner_hero.njk`)
- The inner-page hero: the header, shade and motion of `.hero`, through a `hero--inner` modifier. 772 tall at 1440, and capped at the window height. The title is Display 3, gold then a 1px gold outline, inside the photo. `title_raised` keeps Figma's higher title on Principal's Welcome.

### page_lead (`blocks/page_lead.njk`)
- The navy band under an inner hero: a Heading 4 statement on the left and Body 1 on the right, each revealing line by line. Stacks below 992.

### staff_grid (`blocks/staff_grid.njk`)
- Heading, filter tabs and profile cards. `initFilters()` in `ui.js` matches a tab's `data-filter` against each card's space-separated `data-filter-groups`, hides the rest and refreshes the scroll triggers. In Wagtail, render only tabs that have people, or an empty tab shows an empty grid.

### where_next (`blocks/where_next.njk`)
- "Where to Next?": three image links (only the large one carries the gold arrow, as in Figma), and the "Explore Our School" menu with up to two `outline-dark` buttons. `current` adds the gold dot and `aria-current`. In Wagtail it should come from the page tree, so the current page highlights itself.
- Menu links are 27 tall under a fine pointer and 44 on touch.

### article (`blocks/article.njk`)
- Heading and intro at 822 wide, a 1032 photo, then the quote and body at 826 wide. Intro paragraphs are 25 apart and body paragraphs 28, as in Figma.

### photo_strip (`blocks/photo_strip.njk`)
- A centred Swiper on the shared `slider.js`, with `data-slider-start` setting the first centred slide. There is no loop: the arrows dim at the ends. Slides keep their photo's shape at a fixed height, so renditions decide the width: 1665 x 1080, 1441 x 952 and 1424 x 1090 here. Add a `srcset`; the phone audit flags them as about 2x too wide.

### values_collage (`blocks/values_collage.njk`)
- The photo and the word collage. The words are Figma's vector export with the text outlined (`values-words.svg`), so they scale exactly, with the sentence in the `alt`. Changing a word means a new export.

### faq (`blocks/faq.njk`)
- `initAccordions()` in `ui.js`: one open at a time, the panel animates on `grid-template-rows`, and the arrow turns 180. A closed panel is `visibility: hidden`, so its button leaves the tab order. A row with no `answer` renders a disabled button.

### contact_intro (`blocks/contact_intro.njk`)
- Heading, two paragraphs and two buttons, then four cards with text links. Figma places each card by hand, so from 992 the heading gaps and link positions are set per card with `nth-child`. A fifth card would need its own values, so `cards` is exactly four.

### campus_visit (`blocks/campus_visit.njk`)
- Each campus: a photo with name and detail, contact rows, then a map. `rows.icon` is a sprite id (`location`, `phone`, `laptop`). The map is Figma's screenshot, linking to Google Maps. It is not an embed: swap in an iframe in Wagtail if the client wants a live map, and check its consent and privacy requirements.

### contact_form (`blocks/contact_form.njk`)
- A static form that posts nowhere yet. In Wagtail it should be a form page or Wagtail Forms; the template loops over fields by type. Controls keep the 16px floor and 44px height on touch, and 28 tall under a fine pointer.
- `data-validate` turns on `initForms()` in `forms.js`: messages from `data-error` (empty) and `data-invalid` (wrong format) show in each field's `.contact-form__error`, with `aria-invalid` and `aria-describedby`, and focus goes to the first bad field. `action="#"` shows `value.success` instead of posting; with a real action the form posts normally, and server errors can render into the same `<p>`.
- The select is a real `<select>` inside `data-select`. `initSelects()` builds the combobox and listbox over it from its options, so a Django widget works unchanged. Figma draws no open or error state; the list follows the Quick Links panel, and `--color-error` is not a Figma colour.

### connect_band (`blocks/connect_band.njk`)
- The navy "Connect with us" box, with gold `.social-button()` links from `site.socials`.

### news_hero (`blocks/news_hero.njk`)
- The royal band with the title, the featured-story slider, the Connect box and a photo that drops 104 below the band. Slider: the shared `slider.js` in fade mode. Figma draws one story, so slides 2 and 3 reuse stories from the list.

### news_index (`blocks/news_index.njk`, card markup in `snippets/news-card.njk`)
- Filter bar and story grid. In the static build `initNewsFilter()` in `ui.js` filters by category and search text on the page. In Wagtail the form should submit `GET` and filter the queryset; remove `data-news-filter` then. Figma gives no values for Age or Year group, so they have no options yet. The filters use the same `data-select` dropdown as the contact form; it fires `change` on the native select.

### article_hero (`blocks/article_hero.njk`)
- The news story hero: the royal band with an inset photo, gold tag, date and centred title.

### story_body (`blocks/story_body.njk`)
- Sections of heading, rich text and an optional quote, then the share links and back button. Share links are `#` for now: in Wagtail point them at each network's share URL with the page address.

### photo_strip captions
- `captioned: true` (News Story, `20262:21004`) removes the top padding, adds each image's `caption` under it and uses Figma's position for the left arrow, 11.5 further out.

### author_card (`blocks/author_card.njk`), related_stories (`blocks/related_stories.njk`)
- The royal author box, and "Explore more Stories" with three `news-card` snippets. Both are News Story blocks.

### sports_tabs (`blocks/sports_tabs.njk`)
- Heading, tabs and a card slider (`slider.js`, overflow visible to the right). Tabs use `initFilters()`, which also updates the slider. Figma doesn't say which sports belong to which tab, so all four cards are in every tab for now.

### media_text (`blocks/media_text.njk`)
- One row: heading, rich text, up to two buttons, italic note and a photo flush to the window edge. `side` picks the photo's side. Below 992 the photo comes first.

### Variants on existing blocks
- `where_next`: `flush` sets 100 padding for pages with no white gap around it (News List). `faq`: `flush` removes the top padding and uses 100 below (Contact). `social`: `spaced` uses 100 padding (News List).

### intro (`blocks/intro.njk`)
- The navy band under the hero: the statement and a button on the left; the portrait photo and an outline button on the right, flush to the window edge; the promo video below the statement, flush to the left edge. Fields in `blocks.yaml`. Below 992 it stacks in that order (statement, video, photo); phone layout interpreted.
- `statement` is one rich-text paragraph. Its line break before "on Sydney’s Northern Beaches" only applies from 992 up, where the measure matches the design, so keep a space before it.
- These two buttons have no arrow: the template sets `plain` before the button include (`{% include "snippets/button.html" with btn=value.button plain=True %}`).
- `promo.video` (mp4) starts playing muted on a loop once 30% of it is on screen and its glide reveal has landed (the poster glides in), and pauses when it leaves (`data-ambient="view"` in `snippets/promo.njk`, `initAmbientVideos()`); it loads nothing before that. The pill plays the same file from the start, inline with native controls, and the muted loop picks up again when it ends. Under reduced motion only the poster shows. Without a video the pill is a disabled button and the image shows.
- Renditions: photo `fill-1016x818` (shown 508 × 409), poster `fill-821x514` or larger.
- Media reveals: the promo glides in from the left (`data-anim-type="glide-right"`) and the photo from the right (`glide-left`, on the `.intro__frame` wrapper the template puts around the photo). Both are timed, not scrubbed (`data-anim-scroll="timed"`). Each frame wipes open while its first `img` / `video` slides 24% and settles from 106%, over 1.5s `power2.out`.
- Parallax, as on the designer's reference (lfny.org): from 992 up the photo and its button (`.intro__feature`) drift up 40% of their height across their pass through the window (±20%, about ±96px at 1440), so the photo slides past the promo, which stays put. Same scroll-driven CSS animation as the pillars' column, at Figma's position when the block is centred in the window. Both carry `data-anim-snap`, which rounds the drift to whole device pixels so the outline button's 1px lines stay sharp while the block moves.
- Statement and button: the statement's lines rise with the scroll, like every split title, and the button carries `data-anim-after-title`, which puts its fade-up in the statement's own timeline after the last line, so it never comes in first. Keep the attribute in the template.

### pillars (`blocks/pillars.njk`, card markup in `snippets/pillar-card.njk`)
- "Who we are": eyebrow, Heading 2 title, and a collage of four cards (Local heart, Academic excellence, Student wellbeing, Global mind). The collage is drawn for exactly four, so `cards` is `min_num=4, max_num=4`.
- The template renders two columns from the one list: cards 1 and 3 on the left, 2 and 4 on the right (`loop.index0 % 2` → `forloop.counter0|divisibleby:2`). Each card carries `pillars__card--{{ loop.index }}` (`forloop.counter`), which sets its image shape and width. Below 768 the columns dissolve and the cards return to 1–4 order.
- Parallax, after the designer's reference (lfny.org): from 992 up the right column drifts up 22% of its height across its pass through the window (±11%, about ±181px at 1440), while the left column stays put, so the two slide against each other. That is lfny's 10% doubled, because on a column this tall 10% read as still; it now moves at the intro photo's relative speed. The column is taller than the window, so it is only above or below Figma's position while its own top or bottom is off screen, and it never meets the heading or the stats. It's a scroll-driven CSS animation on the column, which is its own timeline (`data-anim="parallax" data-anim-parallax-trigger`, the range in `--parallax-from` / `--parallax-to`), and it sits at Figma's position when the column is centred in the window. Nothing pans inside the frames, so Figma's crops hold. Renditions are the frame's shape: `fill-1232x820`, `fill-818x1090`, `fill-818x1028`, `fill-1234x814` for cards 1–4. Add a `srcset` with half-width renditions; the 768 audit flags card 1 as 1.8× wider than its slot.
- `video` (optional mp4) plays muted on a loop over the image once 30% of it is on screen, fading in over 0.6s as it starts, and pauses when it leaves (`data-ambient="view"`); nothing loads before that. Unlike the other homepage cards it isn't a hover video: Figma draws the Student Wellbeing card as a playing video, and the client asked for it to autoplay. Under reduced motion the image stays. The video starts once the photo's fade-up has landed.
- `logo` (optional) sits beside the text at 70 × 70: the Round Square mark on Global mind (`assets/images/home/round-square.svg`).
- A line break typed in `text` applies from 1200 up, where the card measure matches the design; below that it reads as a space.
- Reveals: in the left column the photo rises 60px and fades in with the scroll over half a window height (`data-anim-type="rise" data-anim-distance="0.5"` on `.pillars__media`), so it plays while the photo comes on screen. In the right column it only fades, because the column's parallax already carries it up, and the two motions together made those cards jump. The column passes the type to the card include: `{% include "snippets/pillar-card.html" with card=card n=forloop.counter reveal="rise" %}` in the left loop and `reveal="fade"` in the right. The text and button fade up 15px through `data-anim-group` on the card, which skips the media because it carries its own `data-anim`. Opacity and position only, so nothing is repainted while they move.

### stats (`blocks/stats.njk`)
- A list of statistics and an outline button. Each item: `value` as displayed ("1200+", "99%", ">35"), `label`, and `ring`, the share of the circle the white arc draws (0–100). The designer asked for the fill to follow the number, as the brief describes: a stat fills to its own number (99% → 99, 90%+ → 90, >35 → 35), and a count with no total to be a share of (1200+) fills the whole circle. A full ring (100) is drawn without a dash once it lands, which avoids a seam at 12 o'clock. Figma's comp draws 3 on all four. Two per row from 1200 up, one per row below.
- Motion lives in `anim.js` (`data-anim="counter"`): as each item scrolls in, the first number in its value counts up from 0 (prefix and suffix kept, commas kept if typed) while its ring draws clockwise from 12 o'clock to `ring`. It takes 2s, 0.1s apart in list order (`data-anim-order="{{ loop.index0 }}"` → `{{ forloop.counter0 }}`). The ring's final value is the circle's `stroke-dasharray` attribute, so without JS or under reduced motion the finished state shows.
- The ring is inline SVG from the Figma geometry: outer 100, stroke 12.88, white track at 40%.

### usps (`blocks/usps.njk`, card markup in `snippets/usp-card.njk`)
- "Why choose St Luke's Grammar": eyebrow, Heading 2 title, up to two buttons (`style` primary or outline, no arrow), prev / next arrows, and the USP cards in a Swiper slider. Behind them a navy-to-royal band, then the `background` image full-bleed with the Figma shade over it. The image starts 146 above the cards, so it holds its place whatever the heading's length.
- The card's width is rounded to whole device pixels (`round(…, var(--device-px))`, `--device-px` from `initDevicePixel()`). At a half-pixel width Chrome rounds the white card and its photo apart and a 1px white line shows beside the photo, so keep the rounding if the width changes.
- Slider: `slider.js` (`initSliders()`) turns any `[data-slider]` into a Swiper with `slidesPerView: "auto"`, keyboard and a11y on, and 900ms slides on Swiper's default `ease` with `resistance: false` (0ms under reduced motion). Card sliders (all but `data-slider-mode="fade"`) shrink their slides with the drag speed: scale 0.925 + 0.075 × (1 − clamp((v − 0.01) / 2.99)), v in px per ms, set on each slide's `scale` every frame and eased by `transition: scale 0.4s ease-out` (`06-animation/_animation.less`). A click or release starts as a 2.5 px/ms drag that decays by 0.92 a frame. The scale is cleared when the slide lands, and none of this runs under reduced motion. On the way in, the cards rise 60px and fade in with the scroll, staggered left to right: `data-anim-group="rise"` on `.swiper-wrapper` marks each slide as a reveal. The arrows are found inside the nearest `[data-slider-scope]`. `data-slider-gap` is the gap in design px, scaled with the fluid root. The track starts on the container edge and stays `overflow: visible`, so cards run off the left of the window as it moves, as the brief asks. The last card stops on the container's right edge.
- Each card: square image (`fill-800x800`), title, text (a typed line break applies from 768 up), the gold link bar. An optional `video` plays muted on hover, as on the "Who we are" cards. The bodies are at least 176 tall, so the gold bars line up.

### campuses (`blocks/campuses.njk`)
- "Two campuses / one school": two title lines (the second drawn as a gold outline), up to two outline buttons, a rich-text lead, and two campus cards side by side from 992 (stacked below).
- Each card is one link: image (`fill-1234x820`, decorative), shade, name, detail, and a gold arrow. From the prototype's hover state (`Bayview / Dee Why Campus Animation`): on hover the video plays over the image and the arrow fades in. On touch the arrow is always shown, and the video never plays.
- The outline title uses `-webkit-text-stroke` with a navy fill painted over it (`paint-order: stroke fill`), which leaves Figma's 1px outside stroke. It assumes the navy background.

### learning (`blocks/learning.njk`)
- "Learning at St Luke's": two title lines (the second a gold outline), prev / next arrows, a slider of Entry Points cards (the same `slider.js` as the USPs) and an outline button.
- Each card is one link: image (`fill-800x1236`, decorative), Figma's shade over the bottom 37%, title, gold meta line, and an optional short `text`. On hover or keyboard focus the text opens under the meta, lifting the title, and the gold arrow fades in (Figma's Normal → Active). The shade stays as it is, as in Figma's Active variant. On touch the arrow is always shown and the text stays closed.
- The outline title here sits on a gradient, so it uses `.outline-text-clear()`: an SVG filter (`partials/icons.njk`) that grows the glyph with a near-round kernel and cuts the original out, which gives Figma's hollow outside stroke on live text. Keep the `.svg-defs` block in the base template.

### pathways (`blocks/pathways.njk`)
- "Diverse pathways for every student": two title lines (the second a navy outline on white), a lead, a solid button, and up to two rows of linked logos. Row 1 runs right to left and row 2 left to right (by position, `forloop.counter0|divisibleby:2`), as the brief asks.
- The marquee is `initMarquees()` in `ui.js`. It sizes each logo from its `width` attribute (the design size) on the fluid root, copies the row until the lane can loop seamlessly, and gives every row the same speed (35 design px/s). It pauses on hover and keyboard focus. The copies are `aria-hidden` and out of the tab order. Under reduced motion the rows stand still and wrap.
- Each logo is an image with its name as alt text, linking to the institution's site (`url`). The ADF Careers logo is a Figma SVG export with its 7px caption outlined, so no live text falls under the 12px floor.

### discover (`blocks/discover.njk`)
- The full-width promo ("Discover new ways to thrive"): two title lines (the second a hollow gold outline, `.outline-text-clear()`, since it sits on a photo), a lead and up to two buttons, bottom left over a full-bleed image or video with Figma's diagonal navy shade. Below 992 the shade turns vertical and the crop shifts right, so the copy stays readable and the subject stays in frame.
- `video` (optional, the brief's "video or image background"): autoplay muted loop with the image as poster. Background videos carry `data-ambient`; `initAmbientVideos()` holds them on the first frame under reduced motion. The hero's video uses the same attribute.
- New button style `glass` (`.btn-glass`): white at 20% with a 20px background blur, as Figma's frosted button.

### testimonials (`blocks/testimonials.njk`)
- "Hear from our community": two title lines (the second a navy outline), prev / next arrows, a slider of video testimonial cards (the same `slider.js` as Learning) and an `outline-navy` button, 64 tall as in Figma.
- Cards share `snippets/entry-card.njk` and `.entry` with Learning. The template sets `icon` before the include (`{% include … with icon="play" %}` in Django). On hover or keyboard focus the gold play button fades in; on touch it is always shown.
- Each card is one link to its `url`. Figma has no prototype or design for playing a testimonial, so nothing opens in place. The optional `video` plays muted on hover, as on the other image cards. No testimonial videos have been supplied yet.
- Figma's first three crops squeeze the photo about 5% horizontally, and the renditions keep that so they match. Figma's fifth and sixth cards repeat the first two photos under new names, which reads as placeholder content.

### news (`blocks/news.njk`)
- "Latest news and stories": the title on one line (the second half a navy outline) and a "View All News" button (`outline-navy`: gold outline, navy label), then a crossfading feature. Each story is one slide: a royal panel (tags, title, excerpt, "Read Full Story") beside its photo, stacked photo-first below 992. The dots are the slider's pagination, bottom right of the panel.
- Stories should be the newest news pages, not editor-entered (see `blocks.yaml`). Figma shows one story with four dots, so the static build repeats it four times.
- A story with a listing video plays it muted over the photo while the slide is hovered (`data-hover-video`, `initHoverVideos()`), as the designer asked for every image card on the homepage. Hover also holds the rotation, so the video isn't cut off by the next story.
- Rotation per the brief: `data-slider-mode="fade" data-slider-autoplay="4000"`. The next story crossfades in (0.9s) 4s after the last one settles. It waits while the feature is off screen, hovered or holding keyboard focus, and doesn't run under reduced motion. The timer is our own in `slider.js`: Swiper's autoplay got stuck when paused from outside mid-fade. The fade needs `swiper/modules/effect-fade.css`, which `main.less` now imports.
- New button styles: `outline-navy`, and `.btn-small` (Myriad Semibold 16, 41 tall under a fine pointer, 44 on touch). Myriad Pro Semibold is now loaded (`myriad-pro-semibold.woff2`, subset like the other weights).

### social (`blocks/social.njk`)
- "Join the conversation": title (second half a navy outline), navy prev / next arrows, a slider of Instagram tiles (352 × 469, the same `slider.js` behaviour as the USPs), and a gold band with the follow line and the site's social buttons (`site.socials`, the same `.social-button()` as the menu).
- The tiles should come from the school's Instagram feed (latest posts, each linking to its post). The static build uses Figma's eight post screenshots, which carry their captions in the image; a live feed would show the post image and caption separately.
- The band runs 38 past the container on the right from 1400 up, as in Figma.
- A video post (Instagram `media_type` VIDEO) plays its `media_url` muted over the thumbnail on hover, like the other homepage cards.

### cta (`blocks/cta.njk`)
- The "Start your St Luke's journey" banner (Figma's CTA Banner component, so likely reused on other pages): two centred Poppins 90 title lines (the second a hollow 2px white outline, `.outline-text-clear()`, because it sits on moving video), and up to two buttons (Book a Tour gold, Apply to Enrol glass).
- Background: `video` (Figma's is a video fill) as an ambient loop with `data-ambient`, or the `image` alone. Over it are Figma's navy 30% wash and a navy gradient from 56% down, which ends solid navy into the footer.

### placeholder (`blocks/placeholder.njk`)
- Dev-only stand-in for sections not built yet. Not a Wagtail block; drop it from the body when every section exists.

## Content to enter in the admin

- Contact: where the form posts, and the Phone field's placeholder. Figma reads "example@gmail.com" there, and it is built as drawn.
- News List: options for Age and Year group. Figma's feature tag reads "student leadeers" and its first card "Thank to our amazing volunteers"; both are built as drawn and look like typos.
- News List photo: Figma's side photo is a video fill, so the image is a still export.
- News Story: the real author (Figma has "Example Name"), and captions for each photo (Figma repeats one placeholder).
- Extra Blocks: which sports belong to which tab, and "Internal page headline", "Primary Action" and "Secondary Action" are Figma's sample copy. "Rock climbing" repeats the Mountain biking photo in Figma.
- Leadership and Staff: people for Directors, School Council and Anglican Schools Corporation. Figma only lists the Executive Team, so those tabs are empty for now. Larger portraits too: Figma holds 200 x 200, shown 305.
- Principal's Welcome: answers for the last five FAQ rows (Figma only has the first, so the others can't open yet). A larger portrait: Figma holds 900 x 500, shown 1032 wide.
- Principal's Welcome: Figma's menu highlights Leadership & Staff, copied from the other page. It is built as drawn; set `current` on Principal's Welcome, or let the page tree do it.
- Our School and Our School Alternative: a clean poster for the video. Figma's still is a screen grab with a player bar and a pointer burned in (`video-still.webp`), which both pages show because it matches the design.
- Our School Alternative rows 2, 3, 5 and 8: larger photos. Figma only holds 700 × 425 versions, shown about 20% enlarged at 1440.
- Homepage intro: the promo video. The static build uses the clip from the Figma frame (`assets/video/intro-promo.mp4`: H.264, 1426 × 546, 14.7s, no sound, 4 MB). Swap in the full film if the client has one with sound.
- CTA banner video: Figma's file is 720 × 720 (`assets/video/cta.mp4`), stretched to fill 1440 × 826, so it plays soft. Ask for a full-size version. It runs on the seven pages where Figma has it (not the two Our School pages, which use a photo).
- Homepage pathways: the website address for each of the 16 logos (all `#` for now).
- Homepage learning: short descriptions for Junior School, Senior School, HSC and NAPLAN Results, School Services and Support, and Our Facilities (Figma only has Cottage's). The last two cards' meta lines repeat "Pre-K (Ages 3-5)" in Figma, which looks like a placeholder.
- Homepage campuses: the Bayview detail line reads "210 Headland Road, Dee Why" in Figma: check the address with the client.
- Homepage "Who we are": the Student Wellbeing hover video is a 51s 1080p film with its sound removed (`pillar-wellbeing.mp4`, 26 MB). Confirm with the client that it's the right clip for a hover.
