---
title: "Claude Design Prompt — Instagram Image-Gen Prompts (recolored layouts)"
status: draft
created: 2026-06-18
author: Sally (UX Designer)
parent_prd: prd.md
realizes: [FR-7, FR-9]
companions: [story-graphic-template-prompts.md, caption-generation-prompts.md]
brand_source: ../../ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md
reference_posts: original teal+yellow Tiween IG posts (Communion, JCC, Batman, Ramadan, Octobre Rose, Avatar)
---

# Claude Design Prompt — Instagram Image-Gen Prompts

> **Intent:** keep the LAYOUTS and IDEAS of the original Tiween Instagram posts; change only the PALETTE (old bright-yellow + dark-teal → **Gold Leaf × Aubergine**).
>
> **Output wanted:** Claude should produce **ready-to-paste prompts for an image-generation model** (one per template) — NOT HTML/CSS and NOT the images itself. You run those prompts in your image tool.

## 1. Critical guidance — what image-gen can and can't do

Image models render **art, composition, color, and mood** well, but render **text unreliably** — especially shaped Arabic, exact hex values, and precise facts (dates/venues). So the prompts must follow the PRD's load-bearing rule (FR-3: _facts are deterministic, not generated_):

- **Generate the ART layer only:** the duotone portrait, the gold die-cut bite, the color field, the sweep, the mood — and **leave clear negative space** where the headline and fact block will go.
- **Do NOT ask the image model to render the title, date, venue, price, or the `tiween.com` wordmark.** Those get overlaid later as a deterministic text layer (in Placid/Bannerbear or by a designer). Tell the model to leave room for them.
- Describe Gold Leaf × Aubergine in **material/art language** (burnished gold leaf, deep aubergine, screen-print, duotone, die-cut) AND give the hex as backup — image models respond to evocative references better than to hex alone.

## 2. Instagram dimensions

| Format          | Pixels      | Ratio |
| --------------- | ----------- | ----- |
| Story           | 1080 × 1920 | 9:16  |
| Feed (portrait) | 1080 × 1350 | 4:5   |

## 3. THE PROMPT (paste into Claude)

```
You are a senior art director. I'm giving you a set of existing Instagram posts
for "Tiween", a Tunisian cultural-events brand, whose LAYOUTS and CREATIVE IDEAS
I want to keep. The ONLY change is the color palette: the originals use bright
yellow + dark teal; I want them rebuilt in Tiween's new palette, GOLD LEAF ×
AUBERGINE.

YOUR OUTPUT: write ready-to-paste IMAGE-GENERATION PROMPTS — one per template
below — for a text-to-image model. Do NOT write code, and do NOT generate the
images yourself. Each prompt should be a vivid, self-contained paragraph an image
model can render, plus a one-line "negative prompt" and the target aspect ratio.

CRITICAL — facts are NOT generated:
- The image model renders ONLY the ART: duotone portrait, the gold die-cut bite,
  the color field, the corner sweep, mood. It must LEAVE CLEAR NEGATIVE SPACE
  where a headline and a fact block (title/date/venue/price) and the tiween.com
  wordmark will be overlaid later as a separate text layer.
- Instruct the image model NOT to render any readable text, dates, or logos
  (it renders them wrong). Ask for clean empty zones instead. Put "text, letters,
  watermark, logo, dates, numbers" in the negative prompt.

PALETTE — describe in material language AND give hex:
- Field: deep "Midnight Aubergine" — a dark jewel-toned plum/eggplant (#241326).
- Accent: "Gold Leaf" — burnished, slightly antique metallic gold, NOT bright
  neon yellow (#D4A24A). It is the hero accent; keep it punchy and high-contrast
  against the aubergine, never muddy.
- Photos: high-contrast black-and-white / sepia DUOTONE.
- Optional category tints for accents only: magenta-rose #E5478A (théâtre),
  teal #5FD0C2 (shorts), periwinkle #7B9CFF (concerts), orchid #C98AE8 (expo).

SIGNATURE DEVICE (must appear, it's what makes it Tiween):
The taa-(ت) "die-cut bite" — a hard-edged GOLD shape that punches through the
artwork like a Pac-Man-style bite taken out of one edge of the image, with a
small detached puzzle-piece notch nearby. It reads as both an Arabic letter ت
and a smiley face formed from the duotone portrait. Bold and graphic, like
die-cut paper or a screen-printed gig poster — not a small corner logo.

THE LAYOUTS TO REBUILD (reproduce each composition, recolored to gold×aubergine):
1. EVENT POST — a high-contrast duotone B&W portrait of a person; the large gold
   taa-bite punches through the image; a bold diagonal gold "sweep" block anchors
   one bottom corner; clear empty space top-left for a big headline and a fact
   block in the gold sweep. Festival-playbill energy.
2. ENGAGEMENT-QUESTION POST — one dramatic cinematic image (e.g. a hero silhouette)
   on the aubergine field, a gold bite, and clear empty space for a bold question
   headline. Minimal, moody.
3. OCCASION POST — a warm photographic portrait with delicate GOLD LINE-ART motifs
   (a hanging lantern, a crescent-and-star) over it, a gold sweep corner, empty
   space for a celebratory headline. Festive, ornamental.
4. FULL DIE-CUT PORTRAIT — the hero treatment: a duotone B&W portrait with a LARGE
   gold taa-(ت) carved out as the dominant graphic shape filling much of the frame
   (the "Communion" treatment); clean empty band at the bottom for the wordmark.

FOR EACH TEMPLATE, output TWO prompts — one for 9:16 (Instagram Story) and one for
4:5 (Instagram Feed portrait) — adjusting the composition for each crop.

Format each as:
  ### Template N — <name> (<ratio>)
  PROMPT: <the paragraph>
  NEGATIVE: text, letters, words, watermark, logo, dates, numbers, captions
  ASPECT: <9:16 | 4:5>

End with a short note on any composition detail from the originals you had to
interpret.
```

## 4. After Claude returns

- Run the prompts in your image tool; pick the comps where the **gold bite reads as a bold die-cut**, not a logo, and the **gold stays punchy** on aubergine.
- Confirm each output has **clean empty zones** for the headline + fact block — that's what lets the deterministic text layer (real title/date/venue) sit on top without re-generating facts.
- Bring back a winner; I'll map it to `story-graphic-template-prompts.md` and update §1 there (the monogram is currently under-specced as a corner logo — it should be the die-cut bite).

## 5. Flags

- **Recolor only** — layouts/ideas inherited from the originals; palette is the single deliberate change (Gold Leaf × Aubergine per locked DESIGN.md).
- **Text is overlaid, never generated** (FR-3) — image-gen produces art with negative space; facts come from the Weekly List in a later layer.
- Facebook reuses the same assets (9:16 story shared; 4:5 tolerated in feed). TikTok/X deferred with their channels (PRD Q1).

```

```
