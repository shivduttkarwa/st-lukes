# Code audit — 2026-11-10

Audit of the St Luke's cutup at commit `00f7623`: templates, page data, `blocks.yaml`, the handoff doc, LESS and all nine scripts, plus a runtime sweep of every page.

**How it was checked**
- Every page served from the dev server (`localhost:3000`), driven in headless Chromium and in Playwright's WebKit build.
- Sizes: 390 × 844, 667 × 375, 1024 × 768 and 1440 × 1024, scrolled top to bottom.
- `.qa/mobile-audit.mjs` at 320 and 375.
- The CSS and JS compiled separately, to read their warnings.
- Nothing here was tested on a real iPhone.

**Status key**
- **Confirmed**: reproduced in a browser, or measured.
- **Traced**: followed through the code but not reproduced.
- **Needs iPhone**: only a real device can show it.

| Area | Findings |
| --- | --- |
| Bugs visitors can hit | 8 |
| Screen-reader issues | 2 |
| Wagtail handoff gaps | 6 groups |
| Minor | 10 |

---

## 1. Bugs visitors can hit

### 1.1 Sliders take over Page Up/Page Down and the arrow keys for the whole page
- **Where:** [slider.js:141](../src/assets/scripts/slider.js#L141)
- **What happens:**
  - With the home USPs slider on screen, Page Down ×3 leaves the page where it is and moves the slider from slide 1 to slide 4.
  - With the menu open and focus in its panel, ArrowLeft still moves the slider hidden behind it.
  - Page Down is swallowed inside the menu panel and inside an open custom select.
- **Why:** Swiper's keyboard module listens on the whole document. Its `pageUpDown` defaults to on, and it ignores `inert`.
- **Fix:**
  - Use `keyboard: { enabled: true, onlyInViewport: true, pageUpDown: false }`.
  - Call `swiper.keyboard.disable()` while the menu is open, and `enable()` when it closes.
- **Status:** Confirmed

### 1.2 Back to the home page always lands at the top
- **Where:** [head.njk:35](../src/_includes/partials/head.njk#L35)
- **What happens:**
  - Scroll the home page to about y = 5000, open another page, then press Back.
  - If the browser doesn't restore the page from its back/forward cache, the visitor lands at y = 0.
  - Principal's Welcome, by comparison, returns to where you were.
- **Why:**
  - `history.scrollRestoration = "manual"` is set on every home load. It is meant for reloads, so the preloader measures the hero at the top.
  - On Back, the page transition cancels the preloader, but manual restoration stays on.
- **Fix:** set `manual` and `is-preloading` only when the navigation entry's type is not `back_forward`.
- **Status:** Confirmed

### 1.3 Two quick tab clicks show the wrong cards
- **Where:** [ui.js:121](../src/assets/scripts/ui.js#L121); the change it should finish first is at [ui.js:128](../src/assets/scripts/ui.js#L128)
- **What happens:**
  - On Leadership & Staff, click Council and then Directors within about 0.1s.
  - Directors is highlighted, but Council's 5 cards show instead of Directors' 9.
  - The news filter shares this code.
- **Why:** the "already showing" check runs before the running change is finished with `change?.progress(1)`. For the first 0.2s the old cards still count as shown, so going back to the previous tab returns early. Then the running change completes with the other tab's cards.
- **Fix:** in the non-slider path, call `change?.progress(1)` before the early-return check.
- **Status:** Confirmed

### 1.4 Phone preloader title is not kept inside the screen edges
- **Where:** [_preloader.less:7](../src/assets/styles/05-components/_preloader.less#L7), read by [preloader.js:54](../src/assets/scripts/preloader.js#L54)
- **What happens:** below 992 the script reads the edge as **0px** instead of 18 design px, so the title rows may run right to the screen edges. Measured: 0 at 320 and 390, 20 at 1440.
- **Why:**
  - `--preloader-edge: 18 * @px;` compiles to the literal text `18 * 0.0625rem`, which is invalid CSS.
  - LESS doesn't evaluate maths inside a custom property, as CLAUDE.md warns.
  - This is the only such case in the compiled CSS.
- **Fix:** `@preloader-edge-sm: 18 * @px;` then `--preloader-edge: @preloader-edge-sm;`
- **Status:** Confirmed

### 1.5 On an iPhone, dropdowns don't close when you tap blank page
- **Where:**
  - Closing on an outside tap: [ui.js:45](../src/assets/scripts/ui.js#L45) and [forms.js:253](../src/assets/scripts/forms.js#L253)
  - Escape: [ui.js:39](../src/assets/scripts/ui.js#L39)
- **What happens:** open Quick Links, the hero notice or a news filter, then tap the photo or body text. The dropdown stays open.
- **Why:**
  - Closing on an outside tap relies on a `click` listener on `document`. iOS doesn't send `click` for taps on non-interactive elements; Bootstrap works around the same thing.
  - Safari doesn't focus a button when it's clicked, so the custom select's close-on-blur never runs.
  - Escape on a mouse-opened Quick Links does nothing in Safari, because its listener sits on the dropdown itself.
- **Fix:** close on a `pointerdown` listener on `document`, and handle Escape for open dropdowns at document level.
- **Status:** Traced. Needs iPhone.

### 1.6 The News List slider loads all three photos up front
- **Where:** [news_hero.njk:15](../src/_includes/blocks/news_hero.njk#L15)
- **What happens:** the rendered `news.html` has `loading="eager"` on all three slider photos, so slides 2 and 3 download straight away.
- **Why:** `{% if loop.first %}{% set loading = "eager" %}{% endif %}` stays set for the rest of the loop.
- **Fix:** add `{% else %}{% set loading = "lazy" %}`.
- **Status:** Confirmed

### 1.7 Social icon links have no `href`
- **Where:** the social block and the footer, for example `<a class="social__link" aria-label="Facebook">`
- **What happens:**
  - The links can't be reached by keyboard.
  - `aria-label` isn't allowed on an `<a>` with no `href`, so screen readers get no name.
- **Why:** the social URLs are empty in the data, probably waiting on the client.
- **Fix:** add the client's URLs. Until then, guard the link.
- **Status:** Confirmed

### 1.8 The "no results" message animates with reduced motion on
- **Where:** [ui.js:291](../src/assets/scripts/ui.js#L291)
- **What happens:** with reduced motion on, search News for nonsense. The message fades in and slides up 15px over 0.5s.
- **Fix:** run the tween only when `prefers-reduced-motion` is not set; otherwise just unhide it.
- **Status:** Confirmed

---

## 2. Screen-reader issues

### 2.1 The autoplaying home news slider announces every story
- **Where:** [slider.js:126](../src/assets/scripts/slider.js#L126) and [slider.js:163](../src/assets/scripts/slider.js#L163)
- **What happens:** the slide changes about every 4s while the wrapper stays `aria-live="polite"`, so a screen reader reads out each new story.
- **Why:** Swiper's accessibility module sets `polite` because Swiper's own autoplay is off. The custom autoplay never changes it.
- **Fix:** set `aria-live="off"` on `swiper.wrapperEl` while autoplay runs, and `polite` while it's held.
- **Status:** Confirmed

### 2.2 A corrected form field still reads its old error
- **Where:** [forms.js:299–303](../src/assets/scripts/forms.js#L299-L303)
- **What happens:**
  - On Contact, submit the empty form, then type a first name.
  - The now-valid field still has the description "Please enter your first name".
- **Why:** `unflag` hides the error bubble but leaves its text. `aria-describedby` points straight at it, and that text counts even when hidden.
- **Fix:** clear the `[data-error-text]` text once the bubble has hidden.
- **Status:** Confirmed

---

## 3. Wagtail handoff gaps

### 3.1 Fields the templates read that `blocks.yaml` doesn't declare
- **Fields:**
  - `flush` in [faq.njk:1](../src/_includes/blocks/faq.njk#L1) and [where_next.njk:1](../src/_includes/blocks/where_next.njk#L1)
  - `spaced` in [social.njk:1](../src/_includes/blocks/social.njk#L1)
  - `captioned` and a caption per image in [photo_strip.njk:1,7](../src/_includes/blocks/photo_strip.njk#L1). `blocks.yaml:159` declares `images: ListBlock(ImageChooserBlock)`, which can't hold a caption.
  - `site.quick_links_label` in `quick-links.njk:3`, missing from `settings.site`.
- **Effect:** a Wagtail build made from `blocks.yaml` loses the News List and Contact spacing variants, the News Story photo captions and the Quick Links label.
- **Fix:**
  - Declare each field.
  - Make Photo Strip's images `StructBlock(image, caption)`.

### 3.2 Outline buttons have no `style` field
- **Where:** `blocks.yaml` lines 321 (intro `image_button`), 339 (pillars), 349 (stats), 394 (learning), 433 and 441 (testimonials, news)
- **What's wrong:** each is declared as `StructBlock(text, url)  # outline style`. The real look comes from the data's `style` value, which [button.njk:1](../src/_includes/snippets/button.njk#L1) reads with `btn.style | default('primary')`.
- **Effect:** in Wagtail these designed outline buttons render as solid gold primary buttons.
- **Fix:** declare `style: ChoiceBlock(...)`, or hardcode the style in those templates.

### 3.3 IDs that clash if a block is used twice on a page
- **Where:**
  - [contact_form.njk](../src/_includes/blocks/contact_form.njk): `contact-form`, `contact-<name>` and `contact-<name>-error`, with their `for` and `aria-describedby`. [forms.js:282](../src/assets/scripts/forms.js#L282) then finds errors with `getElementById`, so a second form's errors open inside the first.
  - [campus_visit.njk:1](../src/_includes/blocks/campus_visit.njk#L1): `campuses`
  - [hero.njk:22,29](../src/_includes/blocks/hero.njk#L22): `hero-notice` and its `aria-controls`
  - [collage.njk:25–26](../src/_includes/blocks/collage.njk#L25): the circle text's `textPath` target
- **Fix:**
  - Suffix each ID with the Wagtail `block.id`, keeping the `#campuses` and `#contact-form` link anchors stable.
  - Look errors up inside their own form.

### 3.4 Wrong statements in the handoff doc and `blocks.yaml`
| Where | Says | Actually |
| --- | --- | --- |
| `wagtail-handoff.md:132`, `:239` | `loop.index % 2` / `loop.index0 % 2` become `\|divisibleby:2` | that's true on the opposite rows, so a literal swap flips every row's glide and the pillar columns |
| `wagtail-handoff.md:244` | Django include with `reveal="rise"` | `pillars.njk:9` uses `rise-far` |
| `wagtail-handoff.md:174` | Contact intro text uses `data-anim-scroll="timed"` | `contact_intro.njk:6` uses `data-anim-after-title` |
| `wagtail-handoff.md:318` | Last five Principal's Welcome FAQ rows have no answers | the data has six answers, and `:170` says every row has one |
| `wagtail-handoff.md:329` | Where to Next cards and menu links for Our School topics have an empty `url` | the data links them to `/our-school.html` and `/our-school-alternative.html`, matching `:150` |
| `wagtail-handoff.md:143` | Executive Team 10 | the data has 15 |
| `wagtail-handoff.md:136` | Inner hero rows 0.2s apart | the template uses 0.3 |
| `blocks.yaml:32` | The preloader plays once per session | it plays on every load (`head.njk:32–38`, no sessionStorage check) |
| `blocks.yaml:55` | `page_hero` has no parallax | `page_hero.njk:4,6` has parallax, and the handoff doc (`:113`) agrees with the template |
| `blocks.yaml:345` | Stats go two per row from 1200 | the LESS does it from 768 |
| `blocks.yaml:442` | The static build repeats it 4 times | the data has four different stories |

### 3.5 Page data shape
- **What's wrong:**
  - CLAUDE.md says page data is `{ seo, hero, body }`, but no page JSON has a `hero` key.
  - The hero is always `body[0]`, and `search_index.js:24` depends on that.
- **Fix:** change the rule to `{ seo, body }`, with the hero as the first block, so the Wagtail developer knows it's a StreamField block.

### 3.6 Optional fields printed with no `if` guard
- **Tag fields:** print a lone `#` when empty, in `article_hero.njk:6`, `news-card.njk:3` and `news_hero.njk:17`.
- **Collage `stat`, `quote` and `social`** (`collage.njk:23–44`): render an empty figure, an empty quote with its quote mark, and a link with no name.
- **Eyebrows** in `faq:5`, `pillars:4`, `usps:6`, `author_card:5` and `hero:32` leave empty tags.
- **Other optional text** in `campus_visit:5`, `contact_form:8`, `connect_band:6`, `staff_grid:15`, `entry-card:11`, `usp-card:8`, `news:20` and `story_body:13` leaves empty tags.
- **Fix:** wrap each in `{% if %}`.

---

## 4. Minor

1. **Invalid nesting:**
   - [entry-card.njk:9–10](../src/_includes/snippets/entry-card.njk#L9) puts an `h3` inside `span.entry__body` (12 cards on the home page). Make it a `div`.
   - [collage.njk:30](../src/_includes/blocks/collage.njk#L30) puts the `figcaption` inside `div.collage__circle`, not directly inside the figure.
2. **Empty form action:** [news_index.njk:3](../src/_includes/blocks/news_index.njk#L3) has `action=""`, which is invalid. Drop the attribute.
3. **New-tab links with no URL:** `campus_visit.njk:25` and `pathways.njk:17` print `target="_blank"` and "(opens in a new tab)" even when there's no URL.
4. **Images outside the image snippet:** these images skip `snippets/image.njk`:
   - `hero.njk:6`, `page_hero.njk:6`, `inner_hero.njk:6`, `article_hero.njk:3`, `discover.njk:6`, `usps.njk:22`, `pathways.njk:17`, `footer.njk:58`, `menu.njk:28`
   - Several also read `image.srcset`, which isn't in the image contract (`blocks.yaml:4`).
5. **Rule breaks:**
   - An inline style in `icons.njk:10`.
   - Nunjucks Django can't express: an inline `x if c else y` in `head.njk:3–4`, and `{% set current = a and b == c %}` in `where_next.njk:32`.
   - Multi-line comments in `head.njk` (16–17, 45–46, 60–61) and `search_index.js` (39–40).
6. **LESS deprecations:** LESS 4.7 gives 21 deprecation warnings that a future version will turn into errors.
   - 20 are a bare `@fine` in a media query, for example `_base.less:18`, `_header.less:300`, `_menu.less:38`, `_menu.less:112`, `_menu.less:182`, `_footer.less:188`, `_footer.less:234` and `_preloader.less:47`. Use `@media @{fine}`.
   - The 21st is item 1.4.
7. **Raw `px`:**
   - `_menu-icon.less:7,11` sizes the menu icon at `24px` / `30px` wide, so it doesn't scale with the root.
   - `_hero.less:273` uses a `1px` border on the notice.
   - The rest are deliberate hairlines, focus rings or device-pixel rounding.
8. **Hand-written `line-height`** (against the type-mixin rule): `_article-hero.less:83`, `_contact-form.less:83`, `_contact-intro.less:114`, `_hero.less:353`, `_story-body.less:73,108`, `_footer.less:166,316`.
9. **Image weight:** the photo strips serve one large file with no `srcset`, about 1.7–2× wider than they need at 320.
   - Principal's Welcome `strip-1/2/3`: 1,424–1,665px wide.
   - News Story `detail-strip-1/2/3`: 1,650–1,680px wide.
   - Wagtail renditions will cover this, but the static build is heavy on phones.
10. **Unused data field:** `news.json` has a `where_next.cards[].video: null` that nothing reads.

---

## 5. Checked and clean

- **Runtime:**
  - On all 9 pages at the four sizes, no console errors or warnings, page errors, failed requests or 4xx responses.
  - No duplicate IDs. Every `aria-controls`, `aria-labelledby`, `aria-describedby`, `for` and `<use href>` target exists.
  - No text under 12px, and no content left hidden after scrolling through.
- **Templates:**
  - The rendered pages show no `undefined`, `[object Object]`, leftover Nunjucks, double-encoded entities, `href="#"`, or empty `src` or `href`.
  - Every link and button has a name. Every image has `alt`, `width` and `height`.
  - One `h1` per page, with no skipped heading levels.
  - No interactive element inside another. Every form control is labelled.
  - All 280 `/assets/…` references and 51 search thumbnails exist. Every internal link and anchor resolves.
  - `relativeUrls` covers every root-relative URL.
  - No `data-anim-order` inside a loop. Headings are bare. There are no ID selectors in the LESS, and no people's names.
- **Scripts:**
  - Start-up timing between the preloader, page transition and animations is safe, including every fallback timer.
  - Resizing and rotating leaves nothing hidden on any page.
  - Reduced motion is honoured everywhere except item 1.8.
  - The menu dialog's focus handling, `inert`, Escape order and `aria-expanded` all work.
  - Accordions, video cards, the promo, the sports slider and the stacked slider all work.
  - The custom select's keyboard handling and scrollbar dragging work in Chromium and WebKit.
  - No script breaks when a page lacks its block, and nothing runs twice after a back/forward cache restore.
- **Page heads:** each page has its own title and description, `lang="en"` and one `h1`.
- **Ruled out as false alarms:**
  - **Home call to action at 667 × 375:** it reveals correctly. The earlier flag came from a test scroll that stopped short of the bottom.
  - **Home news stories hidden:** these are the three inactive stories, by design.
  - **The hero title running past the screen edges:** an intentional bleed.
  - **Carousel slides off-screen:** expected until swiped.
  - **Native selects at 1 × 1:** hidden behind the custom dropdowns.
  - **DevTools "Lazy-loaded images should have explicit dimensions":** the logos do have `width` and `height`. Chrome flags them only because of `height: auto`. With the images blocked, every box is within 2px of its loaded size, and the page height moves by 1px.
- **Fixed today:** the light line at the hero's foot on scaled screens (`00f7623`).

---

## 6. Suggested order

1. Visitor bugs 1.1–1.4, 1.6 and 1.8. All are small and confirmed.
2. Item 1.5 (iOS dropdowns), then test on an iPhone.
3. Screen-reader issues 2.1 and 2.2.
4. `blocks.yaml` and handoff doc corrections (3.1, 3.2, 3.4, 3.5), before the Wagtail build starts.
5. Clashing IDs (3.3) and optional-field guards (3.6).
6. The minor list.
