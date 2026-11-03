# Figma audit: all built pages

Audited 2026-10-31 against Figma file `Ec8NFmOIMTGbBVYbdJcKD9`, page "02 Approved Design Concept", at the design width of 1440.

## Status after fixes

All the deviations listed below were fixed on 2026-10-31, and a second audit on 2026-11-01 measured text to a fraction of a pixel and added off-screen copy, every line, border and radius, and Figma's hover variants. What remains is under [What still differs](#what-still-differs). Everything from [First audit](#first-audit) down is the audit as first run, kept as the record of what changed.

| Page | Figma height | Live height | Largest section diff | Text 2px or more off |
|---|---:|---:|---|---:|
| Home | 13844 | 13844 | Footer 2.6% | 0 |
| Our School | 6540 | 6540 | Page links 3.6% (first card drawn hovered) | 0 |
| Our School Alternative | 10749 | 10749 | Acknowledgement row 2.7% | 0 |
| Leadership and Staff | 6338 | 6338 | Lead 5.7% (heavier white text) | 0 |
| Principal's Welcome | 8817 | 8817 | Lead 4.8% (heavier white text) | 0 |
| Contact | 8106 | 8106 | Footer 2.1% | 0 |
| News | 6720 | 6720 | Footer 2.1% | 0 |
| News Story | 6413 | 6413 | Footer 2.1% | 0 |
| Extra Blocks | 6653 | 6653 | Lead 4.8% (heavier white text) | 0 |

Every image slot shows Figma's crop, with the Pathways logos within 1px of their slots as they sit before the marquee moves them. Every button and arrow is within 0.7px. Every line is on Figma's row, apart from the form underlines below. All copy matches, apart from the items below and the two typos noted under [Copy to raise with the client](#copy-to-raise-with-the-client). The median section diff is 0.7%, and the largest diffs that remain are Chrome's heavier text.

### What still differs

- **Sub-pixel text offsets.** Two text layers are 0.7px or more off, neither reaching 1px: "St Luke's journey" on the Our School CTAs (0.9px) and the Acknowledgement of Country title (0.7px). 25 distinct layers are 0.5px or more off.
- **Contact form underlines.** Figma centres each 1px stroke on a pixel boundary, so its render smears the line across two rows at half strength. The build draws a crisp 1px line on the lower of the two rows.
- **Heavier text in Chrome.** Accepted on 2026-10-29. On the homepage, white and gold Sanshand text now matches within 4% through the `text-thin` filters on Chrome and Edge on Windows. Navy and royal Sanshand stays 4–6% heavy, and other pages and fonts are unchanged apart from the shared header, footer and entry cards.
- **USP wording: Figma contradicts itself, so both can't match.** The Homepage frame and the USPs Slider frame word cards 1, 4, 5, 8 and 9 differently, and the Homepage frame's off-screen cards also have an older card 8 photo. The build shows the Homepage wording on cards 1 and 4, which are on screen in that frame, and the Slider wording and photo on cards 5, 8 and 9.
- **Main menu Home row.** The Main Menu frame has eight rows and the Submenu frame has nine, with Home. The build keeps Home because its submenu is the demo navigation to every built page.
- **Cards Figma draws hovered.** Cottage, the first Our School card and Bayview's arrow match Figma on hover, not at rest.
- **Outline at other widths.** The hollow outline on Learning, Discover, the CTA and the footer marquee stays at its fixed 1px or 2px rather than scaling with the page. It hasn't been tested in Safari.
- **Hover states with no Figma variant.** Figma defines hovers for the filter tabs, main menu rows, Where next links and social icons, and these match. Buttons, arrows and cards have no hover variant, so theirs are the build's own.
- **Video.** Figma's video fills can't be exported, so those slots show Figma's stills until the files are supplied.
- **Quick Links label, centred rather than Figma's.** Figma sets it 0.5px above the pill's centre at 1440; the build trims the label to its caps so it is centred at every size (it had sat up to 1.9px high on larger screens). Changed on 2026-11-03 at the user's request.

### Decisions taken to match Figma literally

- **Stat rings** draw Figma's 3% on all four, although the brief describes each arc growing to its stat's value. To restore that, set `ring` in `home.json` to 100, 99, 90 and 100.
- **First "previous" arrow** is solid, as drawn, so nothing but the cursor shows it's inactive on the first slide.
- **Our School video still** has the player bar baked in, because that's Figma's image.

## First audit

### Verdict

**The build does not yet match Figma with zero deviation.** Of 77 page sections, 1 is missing, 9 have a visible difference, 44 are within about 5px and 23 match outright.

Layout is very close. Every page except Home lands within 1px of its Figma height, and 125 of the 144 image and video slots show the correct crop in the correct place. The other 19 are explained under [What was checked](#what-was-checked).

| Page | Figma content height | Live height | Missing | Visible | Minor | Match |
|---|---:|---:|---:|---:|---:|---:|
| Home | 13844 | 12812 | 1 | 6 | 7 | 0 |
| Our School | 6540 | 6540 | 0 | 1 | 3 | 1 |
| Our School Alternative | 10749 | 10749 | 0 | 0 | 4 | 9 |
| Leadership and Staff | 6338 | 6338 | 0 | 0 | 4 | 2 |
| Principal's Welcome | 8817 | 8818 | 0 | 0 | 7 | 2 |
| Contact | 8106 | 8107 | 0 | 0 | 6 | 3 |
| News | 6720 | 6721 | 0 | 1 | 4 | 1 |
| News Story | 6413 | 6414 | 0 | 1 | 5 | 1 |
| Extra Blocks | 6653 | 6654 | 0 | 0 | 4 | 4 |
| **Total (77 sections)** | | | **1** | **9** | **44** | **23** |

The News and News Story frames in Figma are shorter than their content (6714 and 5632) because they clip the footer, so the table uses the content height.

**Key:** ✅ Match: copy identical, ink and boxes within 1px. 🟡 Minor: a measurable difference of about 5px or less. 🔴 Visible: a different image, state or element that a reviewer would notice. ⛔ Missing: not built.

## Fix these first

| # | Deviation | Where | Measured | Cause or fix |
|---|---|---|---|---|
| 1 | "Hear from our community" section is not built | Home | Figma node `20195:16202`, 1034 tall, six video cards, two arrows, one button. Home is 1032px short | No block, data or copy exists in `src`. Needs a new block and the card videos |
| 2 | "Who we are" photos are zoomed | Home | All four shown at 110% of Figma | The parallax layer is larger than its frame (`_pillars.less:94`). Drift the frame instead, as the collage portrait does |
| 3 | Stat rings are nearly full white | Home | Figma draws a 3% white arc on all four. Live draws to the `ring` value (100, 99, 90…) | Built on purpose as an animation end state. See [decision 1](#decisions-needed) |
| 4 | Bayview card shows the wrong picture | Home | Figma's aerial street still. Live uses the harbour photo from Contact | Export Figma's still for `campus-bayview` in `home.json` |
| 5 | Video still is a different crop | Our School | Live uses `video-poster.webp`. Our School Alternative uses `video-still.webp`, which matches | Point `our-school.json` at the same still as the alternative page |
| 6 | First "previous" arrow is faded | Home USPs, Learning, Social; News Social | Opacity 0.4. Figma draws it at 1 | Disabled state that Figma doesn't draw. See [decision 2](#decisions-needed) |
| 7 | Off-screen USP cards differ | Home USPs | Card 8 has a different photo. Copy on cards 5, 8 and 9 differs (below) | Update `home.json` and `usp-8.webp` from `20169:13242` |
| 8 | Photo strip arrows sit too high | News Story | 16px above Figma (2919 against 2936) | Live centres them on the photo; Figma places them lower. Applies to the `captioned` variant only |

## Deviations on shared parts

These are listed once. Page tables refer to them by code. G2 is on every page and G3 is on every footer.

| Code | Deviation | Measured |
|---|---|---|
| **G1** | Buttons on Home, the CTA, Values, FAQ and the footer are 1–2px wider than Figma | Padding 30 plus a 1px border, so a label is 31 in where Figma has 30 (`_buttons.less`, lines 16 and 29). The border should come off the padding. Neighbouring buttons shift 1–3px: "Book a Tour" −1.6, "Apply to Enrol" label +2, "View Facilities" label +3. Buttons on other sections are within 1px |
| **G2** | Header labels are slightly off | TOURS +3, ENQUIRE +2.5, ENROL +1 in x, with the right edge held at 1298. Quick Links label +2 in y |
| **G3** | Footer text sits low | Column headings +2, "Cottage" lines +2, addresses +1, statement +1 to +2. "Global Mind." −3.5 in x. The Directions arrow is smaller than Figma's. "Enrol Now" is 1.4px wide (G1) |
| **G4** | "Where to next" card titles sit low | Small cards +3, large card +5 |
| **G5** | Social block | "Conversation" −5 in x (the gap after "Join the" is tighter). "Follow life…" +3 in y |
| **G6** | Sanshand and Myriad text on Home's upper sections sits low | Myriad copy +2, Sanshand 20–25 +2, Sanshand 45 +5. Inner pages already carry the optical correction that these sections lack |

## Home

| Section | Figma node | Result | Diff | Deviations |
|---|---|---|---:|---|
| Hero | `20169:5668` | 🟡 | 1.2% | G2 |
| Intro band | `20169:5667` | 🟡 | 3.9% | Statement +5 (G6). G1. Live starts at 813 where Figma's band starts at 812 under the hero, so sections below sit 1px lower |
| Who we are | `20169:5693` | 🔴 | 12.0% | All four photos at 110% (#2). G6 on the heading and copy. G1 |
| Stats | `20169:5726` | 🔴 | 4.9% | Rings (#3). Copy +2 (G6). G1. Numbers match |
| USPs | `20169:5734` | 🔴 | 2.9% | Faded arrow (#6). Off-screen cards (#7). G6 on the heading, eyebrow and card titles. G1 |
| Campuses | `20169:5760` | 🔴 | 13.5% | Bayview picture (#4). Lead and detail lines +2 (G6). G1. Figma draws Bayview with its hover arrow; the live hover shows it correctly |
| Learning | `20169:5779` | 🔴 | 2.0% | Faded arrow (#6). Card labels −2 at rest. G1. Figma draws Cottage in its hover state; the live hover matches it |
| Pathways | `20169:5850` | 🟡 | 2.1% | G1. All 14 logos within 1px |
| Discover | `20169:5794` | 🟡 | 1.6% | G1 |
| Hear from our community | `20195:16202` | ⛔ | n/a | Not built (#1) |
| News | `20169:5802` | 🟡 | 1.7% | "and stories" −4 in x. Second and third tags −2 and −4 in x (tighter gaps). G1 |
| Social | `20169:5831` | 🔴 | 1.2% | Faded arrow (#6). G5 |
| CTA | `20169:5887` | 🟡 | 3.8% | G1 |
| Footer | `20169:5888` | 🟡 | 4.2% | G3 |

Copy on the off-screen USP cards (`20169:13242`):

| Card | Figma | Live |
|---|---|---|
| 5 | We live out an authentic Christian faith that is welcoming and inclusive, not exclusive. | Authentic Christian faith that is welcoming and inclusive, not exclusive. |
| 8 title | Exceptional sport and Athlete programs | Exceptional sport and Athlete program |
| 8 | Students can participate in State title-winning basketball teams, Australian-representative athletes, Talented Athlete Program (TAP). | State title-winning basketball teams, Australian-representative athletes, Talented Athlete Program (TAP). |
| 9 | We're building a new Senior Campus + Sports Complex on Pittwater Rd (2029–2031) as part of our Masterplan. | Plans for a new Senior Campus + Sports Complex on Pittwater Rd (2029–2031) |

### Site-wide overlays (checked on Home)

| State | Figma node | Result | Deviations |
|---|---|---|---|
| Main menu | `20169:15359` | 🔴 | Figma's frame has eight rows, no Home row, and Our School active. Live has nine rows and nothing active. See [decision 3](#decisions-needed) |
| Submenu | `20169:15593` | ✅ | |
| Quick links | `20169:15270` | ✅ | |
| Announcement card | `20169:15196` | ✅ | |
| Preloader, steps 1–4 | `20169:6962`, `6952`, `6972`, `20225:17119` | ✅ | Sequence and title positions match. It only plays with `?preloader` for now, as the handoff doc records |

These are shared states rather than page sections, so they are not counted in the 77.

## Our School

| Section | Figma node | Result | Diff | Deviations |
|---|---|---|---:|---|
| Hero | `20420:27600` | 🟡 | 0.9% | G2 |
| Collage | `20420:27599` | 🔴 | 9.3% | Video still (#5). "99%" +3 in x. "Student Name" and "Year 10" +2 in y |
| Page links | `20420:28063` | ✅ | 3.6% | Figma draws the first card in its hover state; the live hover matches it, which accounts for the diff |
| CTA | `20420:28190` | 🟡 | 2.1% | G1 |
| Footer | `20420:28191` | 🟡 | 4.4% | G3 |

## Our School Alternative

| Section | Figma node | Result | Diff | Deviations |
|---|---|---|---:|---|
| Hero | `20348:24216` | 🟡 | 0.9% | G2 |
| Collage | `20348:24215` | 🟡 | 2.4% | "99%" +3 in x. "Student Name" and "Year 10" +2 in y. See [decision 4](#decisions-needed) for the still |
| Row: Principal's Welcome | `20412:27187` | ✅ | 1.6% | |
| Row: Why Choose | `20412:27180` | ✅ | 2.0% | |
| Row: Christian Foundation | `20413:27239` | ✅ | 2.0% | |
| Row: Leadership and Staff | `20413:27245` | ✅ | 2.0% | |
| Row: Strategic Plan | `20413:27261` | ✅ | 2.0% | |
| Row: Masterplan | `20413:27267` | ✅ | 2.3% | |
| Row: Round Square | `20413:27300` | ✅ | 2.1% | |
| Row: History | `20413:27286` | ✅ | 1.9% | |
| Row: Acknowledgement | `20413:27314` | ✅ | 2.7% | |
| CTA | `20413:27325` | 🟡 | 2.1% | G1 |
| Footer | `20413:27326` | 🟡 | 4.4% | G3 |

## Leadership and Staff

| Section | Figma node | Result | Diff | Deviations |
|---|---|---|---:|---|
| Hero | `20169:5890` | 🟡 | 0.5% | G2 |
| Lead | `20169:5896` | ✅ | 5.7% | The diff is Chrome's heavier white text only |
| Staff | `20169:5899` | ✅ | 0.1% | All 15 people, photos and filter tabs match |
| Where next | `20169:5926` | 🟡 | 1.4% | G4 |
| CTA | `20169:5924` | 🟡 | 3.8% | G1 |
| Footer | `20169:5925` | 🟡 | 4.6% | G3 |

## Principal's Welcome

| Section | Figma node | Result | Diff | Deviations |
|---|---|---|---:|---|
| Hero | `20262:20150` | 🟡 | 0.3% | G2 |
| Lead | `20262:20199` | ✅ | 4.8% | The diff is Chrome's heavier white text only |
| Article | `20262:19578` | 🟡 | 0.9% | Heading tracking −0.28px where Figma has −0.35px (−1%) |
| Photo strip | `20262:20746` | ✅ | 0.2% | |
| Values | `20262:22075` | 🟡 | 1.7% | G1. The word collage is outlined artwork and matches |
| FAQ | `20262:22114` | 🟡 | 0.6% | "View more FAQs" +1 in y. G1 |
| Where next | `20262:20810` | 🟡 | 1.4% | G4 |
| CTA | `20262:19662` | 🟡 | 3.8% | G1 |
| Footer | `20262:19663` | 🟡 | 4.0% | G3 |

## Contact

| Section | Figma node | Result | Diff | Deviations |
|---|---|---|---:|---|
| Hero | `20169:13362` | 🟡 | 0.7% | G2 |
| Intro | `20169:13367` | ✅ | 2.7% | The diff is Chrome's heavier text only |
| Visit | `20169:13393` | ✅ | 0.4% | |
| Form | `20169:13420` | 🟡 | 0.8% | Last Name column −2 in x (the gap is tighter). Select chevron −2 in y. All placeholders match |
| Connect | `20169:13436` | ✅ | 0.6% | |
| FAQ | `20169:13443` | 🟡 | 0.7% | "View more FAQs" +1.3 in y. G1 |
| Where next | `20169:13456` | 🟡 | 1.8% | G4 |
| CTA | `20169:13486` | 🟡 | 4.0% | G1 |
| Footer | `20169:13487` | 🟡 | 4.1% | G3 |

## News

| Section | Figma node | Result | Diff | Deviations |
|---|---|---|---:|---|
| Hero band | `20169:14033` | 🟡 | 1.0% | G2 |
| News list | `20169:14009` | ✅ | 1.9% | Filter bar and all nine stories match |
| Social | `20225:16410` | 🔴 | 1.2% | Faded arrow (#6). G5 |
| Where next | `20225:16472` | 🟡 | 1.4% | G4 |
| CTA | `20225:16470` | 🟡 | 3.8% | G1 |
| Footer | `20225:16471` | 🟡 | 4.0% | G3 |

## News Story

| Section | Figma node | Result | Diff | Deviations |
|---|---|---|---:|---|
| Hero | `20169:14108` | 🟡 | 0.7% | Tag chip 69.5 wide against 71, 1px further in. G2 |
| Body | `20262:20964` | 🟡 | 0.9% | Heading tracking −0.28px where Figma has −0.35px |
| Photo strip | `20262:21004` | 🔴 | 1.1% | Arrows 16px high (#8) |
| Author | `20262:20261` | ✅ | 1.9% | |
| Related | `20262:21039` | 🟡 | 1.4% | "Explore more Stories" +3 in y |
| CTA | `20262:22477` | 🟡 | 3.8% | G1 |
| Footer | `20262:22478` | 🟡 | 4.2% | G3 |

## Extra Blocks

| Section | Figma node | Result | Diff | Deviations |
|---|---|---|---:|---|
| Hero | `20262:20302` | 🟡 | 0.4% | G2 |
| Lead | `20262:20307` | ✅ | 4.8% | The diff is Chrome's heavier white text only |
| Sports | `20262:20250` | ✅ | 1.2% | |
| Row A | `20262:20234` | ✅ | 1.2% | |
| Row B | `20262:20241` | ✅ | 1.3% | |
| Where next | `20262:20881` | 🟡 | 1.4% | G4 |
| CTA | `20262:20300` | 🟡 | 3.8% | G1 |
| Footer | `20262:20301` | 🟡 | 4.2% | G3 |

## Decisions needed

These can't be settled from the code, because Figma disagrees with itself or with an earlier decision.

1. **Stat rings.** Figma draws the same 3% arc on all four, which reads as an animation's first frame. The build animates to a real value. Keep the animation, which is my recommendation, or match the drawing literally.
2. **Faded first arrow.** Fading it is the better behaviour, because the arrow does nothing on the first slide, but it is not in Figma. Keep it only if the designer agrees.
3. **Main menu rows.** The Main Menu frame has eight rows and the Submenu frame has nine, with Home. The build follows the Submenu frame, which I recommend, and the designer should correct the other frame. The Main Menu frame also shows another school's announcement copy behind the scrim, so it looks like an older draft.
4. **Video still with player controls.** Figma's still has a player bar baked in ("0:12 / 1:07"). Our School Alternative copies it faithfully. It looks like a screenshot rather than a real poster, so ask for a clean frame.
5. **USP copy.** The USPs Slider frame and the Homepage frame word cards 1 and 4 differently. The build uses the Homepage wording for those two, so the designer should say which is final.

## Copy to raise with the client

The build matches Figma on all of these, but they look like errors in the design:

- Home Campuses: the Bayview card reads "210 Headland Road, Dee Why", which is the Dee Why campus address.
- News hero: "student leadeers".
- News list: "Thank to our amazing volunteers" and "Ambassadors host raise money".
- News hero lead: "St luke's" with a lowercase l.

Two typos are already corrected in the build with no visible change: "st Luke's" (USPs eyebrow) and "PRe-K to 12" (Learning).

## Accepted, not counted as deviations

- **Heavier text in Chrome.** Chrome draws text heavier than Figma on Windows, most visibly white text. This was accepted on 2026-10-29 and accounts for most of the diff on text-heavy sections.
- **Body text alpha.** The 0.75 alpha in `_tokens.less` is exactly Figma's value.
- **Bayview footer column.** It sits 2px higher because the template shares one field style with Dee Why, as the handoff doc records.
- **Uppercase on Sanshand headings.** Live uses `text-transform` where Figma types mixed case. Text position and shape measured the same, so there is no visible change.

## What was checked

For each section, at 1440 × 1000 with motion off, on the dev server build:

- **Pixels:** a side-by-side comparison with Figma's render, viewed by eye, plus a diff score. The score is the share of pixels that differ after a slight blur, so it includes Chrome's text weight and is a guide rather than a pass mark.
- **Copy and type:** every Figma text layer against the live DOM for words, font, weight, size, line height, tracking, colour and alpha.
- **Ink position:** where each text layer's ink lands in both renders, to the whole pixel. Box positions alone mislead, because some boxes are deliberately offset to correct Chrome's text placement.
- **Images:** 144 image and video slots for box position and for the actual crop inside. 19 were flagged: the four "Who we are" photos, Bayview, the Our School video still, the first Our School card (drawn in its hover state), nine logos off by 1px or less, two News Story images and one CTA image that sit 1px off with the page offset.
- **Controls:** buttons, arrows, tabs and social icons for position and size.
- **States:** menu, submenu, quick links, announcement card, preloader, and hover on the Cottage, first Our School and Bayview cards.

## What this audit could not cover

- **Phone and tablet.** Figma still has no mobile frames, so those layouts have nothing to be compared against.
- **Widths other than 1440.** Figma only has this width.
- **Video playback.** Figma's video fills can't be exported, and only the promo video file exists in the project. These video slots show stills: Bayview, the Wellbeing tile, Senior School, both Our School collages, the News hero photo and the CTA on the seven pages where Figma uses video. The stills match apart from #4 and #5. The Dee Why card's hover video is the promo file, and Figma draws that card as a photo.
- **Other hover and focus states.** Button, tab, filter and link hovers were not compared with Figma's component variants.
- **Repeated renders.** The CTA was rendered once per variant (two) and the footer once plus Home's clipped copy, then compared on every page. Figma's layer data confirms all nine footers have identical copy and positions, and the CTA copy is the same on every page.

Comparison images for every section are in `.qa/renders/figma-audit/`, which is git-ignored.
