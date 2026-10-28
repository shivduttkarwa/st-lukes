# Design guidelines from the designer

Transcribed from the designer's chat of 27 October 2026 (screenshots in `build-guide-chat-screenshots/`, not committed). Read this before building any section; each item below is a requirement unless marked as a reference.

## Tone

- Concept: **"Local Heart. Global Mind."**
- "Keep animations subtle and smooth. Nothing moving or stopping too quick, or bouncing. Needs to feel premium for this grammar school."
- GSAP for smooth scrolling and animations (Lenis + GSAP in `anim.js`).
- Subheading text blocks: "a nice line-by-line staggered reveal up effect".
- The rest of the site build is described as straightforward; the homepage carries most of the motion.
- Mobile layouts are **not designed yet**; the designer will send them. Until then phone layouts are interpreted. The last message in the chat attaches a phone-width screenshot of the homepage hero and intro (`Screenshot 2026-10-28 083817.png`), which reads as a first mobile draft: hero text stacked, intro copy, campus image, portrait photo, statement band.
- Two screen recordings were shared in the chat (the Scotch College hero, the Merchant Taylors menu) but are not in the screenshots folder; only their descriptions are captured here.
- Overall reference: lfny.org.

## Homepage

### Preloader → hero (frames Preloader Step 01–04, `20169:6962`, `20169:6952`, `20169:6972`, `20225:17119`)
1. Navy screen with **concentric circles** that grow out from the centre subtly, or pulse slightly.
2. "LOCAL HEART." comes in from the **left** of the canvas, "GLOBAL MIND." from the **right**.
3. Just before the text arrives in place, a **circle mask starts to grow** from the centre to reveal the hero image or video.
4. Once the mask reveals the full screen, the words **move down into their hero position**, the **header elements move in from the top** in a subtle staggered motion, and the **announcement text on the right fades in**.
- Hero reference: scotch.vic.edu.au (video hero with explore row).

### Hero
- Background must allow **either video or image** (CMS option).
- **Announcement card** (frame `20169:15196`, card `20195:15969`): sits bottom-right over the hero, partially shown; **reveals the full card on hover**.
- **Quick links dropdown** in the top header (frame `20169:15270`): smooth ease-in dropdown animation.

### Header and menu (frames `20169:15359`, `20169:15593`)
- Main menu **fades / flies in from the right** while a dark overlay comes over the page at the same time.
- Clicking a main menu item **expands the panel to the left** to reveal the submenu; submenu background is **white**.
- A **child-page thumbnail** sits bottom-right of the submenu and **changes on hover** of each submenu item.
- Menu reference: mtsn.org.uk.
- **Search** (inside the open menu): results show as **rows with a thumbnail on the left and title + short description on the right**, under the search bar; **"Popular searches"** text list on the right, in place of the submenu items.

### Image blocks
- **Subtle vertical parallax on scroll** on the image blocks (the "Local heart / Academic excellence / Student wellbeing / Global mind" card collage and similar).

### Stats
- The **white circle outline grows clockwise from 0 to the value** (e.g. 90% draws 90% of the circle).
- The **gold numbers count up** from 0 to their final value.

### Sliders
- Sliders on the homepage: **USPs**, **Learning at St Luke's**, **Hear from our community** (video testimonials), **Join the conversation** (Instagram), **Latest news and stories**.
- Instagram, Learning and USPs sliders **start left-aligned to the container**; when they slide, cards **run off the left edge of the canvas** (full-bleed to the left while moving).
- **Latest news and stories**: autoplay rotation, about **4 seconds**.
- Instagram section pulls the school's feed.

### Cards and hover
- **All image cards on the homepage allow an optional video on hover** (campus cards "Two campuses, one school", video testimonials, and the rest). Prototype: `figma.com/proto/Ec8NFmOIMTGbBVYbdJcKD9/…?node-id=20239-17320&page-id=20239%3A17318`.
- **Learning cards**: on hover the short description **fades in** and a **taller background gradient moves up**.

### Pathways (logos)
- Top row of logos: **slow linear marquee right → left**; bottom row: **left → right**, same speed.
- **Every logo links** to the university or company website.

### Full-width promo ("Discover new ways to thrive")
- Option for **video or image background**.

### Footer
- The large **"LOCAL HEART. GLOBAL MIND."** text is a **slow, linear, endless marquee right → left**, repeating the phrase: "LOCAL HEART. GLOBAL MIND. LOCAL HEART. GLOBAL MIND. …"

## Landing pages (e.g. Our School, `20420:27598`)
- The large hero text **animates in like the preloader**: top row from the left canvas, bottom row from the right.
- The **section below the hero is a collage**: a video (autoplay, no sound), a portrait image on the right with subtle parallax, a text quote, an animated statistic in a gold circle, and an Instagram tile (image or video) bottom-right.
- Collage reference: the dark-blue section halfway down iszl.ch, **without** its diagonal scroll movement.

## What this means for the build

| Behaviour | Implementation |
|---|---|
| Smooth scroll, reveals, split titles, parallax | `anim.js` (Lenis + GSAP), `data-anim-*` |
| Line-by-line subheading reveal | `data-anim="split" data-anim-type="lines"` |
| Preloader + circle mask | one-off `preloader.js`, GSAP timeline, plays once per session, skipped under reduced motion |
| Counters and circle progress | `data-anim="counter"` and an SVG ring on `stroke-dashoffset`, added to `anim.js` |
| Marquees (logos, footer text) | CSS `@keyframes` linear infinite, paused under reduced motion; two rows with opposite directions |
| Hover video on cards | `data-hover-video`: `<video muted playsinline preload="none">` over the image, plays on pointer enter, pauses and resets on leave; never autoplays on touch; off under reduced motion |
| Sliders | Swiper (`slider.js`), left edge snapped to the container, overflow visible to the left while moving |
| News autoplay | Swiper autoplay 4000ms, paused on hover and when off screen |
| Menu, submenu, quick links, announcement card | `ui.js`, CSS transitions on `--ease-settle`, no bounce |
| Hero media, promo media, card media | every media slot is `image` + optional `video` in `blocks.yaml` |
