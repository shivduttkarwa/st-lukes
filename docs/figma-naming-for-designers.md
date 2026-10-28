# Figma naming for new designs

A short convention for new files. It lets the build team read block names and editable fields straight from the layer tree, so the website's CMS fields match the design exactly. Nothing changes in how you design; only in what you name.

## 1. Sections

Name each section frame inside a page frame `block/<name>`, lowercase with underscores. Use the same name wherever the same section appears on another page.

```
block/hero
block/usp_slider
block/stats
block/promo_banner
block/pathways_logos
```

## 2. Editable content

Name the layers that hold content for what they are:

| Layer name | Means |
|---|---|
| `title`, `eyebrow`, `caption`, `quote` | a single line of text |
| `body` | paragraphs (rich text) |
| `image` | a photo slot |
| `video` | a video slot |
| `image/video` | a slot that may be either |
| `button`, `button_secondary` | a button (its text is the label) |
| `link` | a clickable card or line |

Decorative layers (shapes, backgrounds, dividers) can keep any name.

## 3. Repeating things

Cards, logos, stats, slides: a frame named `items` containing frames named `item`, each item with the same layer names inside.

```
block/stats
  title
  items
    item  →  value, label
    item  →  value, label
```

Best of all, make the card a **component** and name its properties the same way (`title`, `image`, `show_button`). Every copy then carries the right names automatically.

## 4. Variants and optional parts

- A style variant: `block/promo_banner --dark`
- A layer the editor may leave empty: `caption [optional]`

## 5. Mobile frames

Put them on the same page as the desktop frames, in the same section order, named after the desktop frame with ` M`: `Homepage M`, `Our School M`.

## 6. Tidy up

Delete leftover layers rather than hiding them. Hidden layers are read as content.

That's the whole convention: section names, field names, `items`/`item`, mobile frames alongside, nothing hidden.
