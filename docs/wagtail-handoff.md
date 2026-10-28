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
- `children[].image` is the submenu thumbnail, swapped on hover/focus of each child row — a page field (e.g. `menu_image`), fall back to the page's hero image. Nunjucks `item.children[0].image` → Django `item.children.0.image`.
- `site.menu_links` (six small links), `site.utility_links` (Tours / Enquire / Enrol, shown in the header and again inside the panel), `site.socials` (`network` is the sprite icon id) and `site.quick_links` are site settings.
- The search field posts `GET /search/?q=`. The results view (rows with thumbnail + title + description, "Popular searches" on the right) is described in `docs/design-guidelines.md` but not designed or built yet.
- Behaviour lives in `ui.js` (`initMenu`): overlay + panel slide in, panel widens to the left when a submenu opens, `inert` on the rest of the page, scroll lock with Lenis stopped, Escape and overlay click close, focus returns to the burger. Copy `main.js` as-is.
- Below `lg` the panel is full width and submenus open as accordions; the thumbnail is hidden. Phone layout is interpreted until the designer's mobile frames arrive.

## Blocks

### hero (`blocks/hero.njk`)
- Fields in `blocks.yaml`. The background is `image` or `video` (mp4, autoplay muted loop, the image as poster). The image needs renditions at 768, 1280 and 1920 wide for the `srcset`.
- The title is two CharBlocks so the designer's two-line layout (first line flush left, second flush right) holds whatever the words are.
- `notice` is the announcement card: a teaser strip at rest, the full card on hover, focus or tap. It is a hero field for now; move it to a site setting if the client wants to change it without editing the page.
- The header is site chrome (`partials/header.njk`): `site.quick_links` and `site.utility_links` from `site.json`; the logo files are `assets/icons/crest.svg` and `wordmark.svg`.

### placeholder (`blocks/placeholder.njk`)
- Dev-only stand-in for sections not built yet. Not a Wagtail block; drop it from the body when every section exists.

## Content to enter in the admin

_None yet._
