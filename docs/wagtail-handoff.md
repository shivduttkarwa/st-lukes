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
