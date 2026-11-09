---
target: shorts directory and detail pages
total_score: 17
max_score: 40
na_heuristics:
p0_count: 2
p1_count: 2
target_identity: "file:/Users/ayoub/projects/tiween-bmad-version/apps/client/src/app/[locale]/shorts"
timestamp: 2026-11-09T12-21-10Z
slug: src-app-locale-shorts
---

Method: dual-agent (A: design review · B: detector + browser overlay)

## Design Health Score

| #         | Heuristic                       | Score     | Key issue                                                                                                            |
| --------- | ------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of system status     | 2         | Directory hero auto-rotates every 8s; slide dots buried under first rail; 10 of 39 images broken, raw alt text shows |
| 2         | Match system / real world       | 1         | Arabic directory is all French; bidi reverses "13 min"/"1 Prix"; page title duplicates the brand and stays French    |
| 3         | User control and freedom        | 2         | No carousel pause (rotates under keyboard focus); genre pills are dead buttons                                       |
| 4         | Consistency and standards       | 1         | Two design languages: directory = stock streaming chrome, detail = Gold Leaf × Aubergine spine                       |
| 5         | Error prevention                | 2         | "Regarder" promises playback but only navigates; watchlist heart is local-only, lost on reload                       |
| 6         | Recognition rather than recall  | 2         | Rails show title only; desktop cards hide title/meta behind hover                                                    |
| 7         | Flexibility and efficiency      | 1         | Live directory has no search, filter, sort or grid; the built ShortsDirectory isn't mounted                          |
| 8         | Aesthetic and minimalist design | 2         | Detail is disciplined; directory repeats the same films across five rails                                            |
| 9         | Error recovery                  | 2         | Good error/retry/empty states exist only in the unmounted directory                                                  |
| 10        | Help and documentation          | 2         | Nothing tells a first-timer what the catalogue is                                                                    |
| **Total** |                                 | **17/40** | **Poor** (detail page alone ≈ 27)                                                                                    |

## Design Specificity Verdict

LLM: split. Directory (ShortsShowcase) ≈ generic streaming clone — code literally says "Netflix-style hover effect"; nothing Tiween survives a palette swap; violates "playbill, not a streaming app"; ends on "← Retour aux prototypes". Detail page is authored (scoped tokens, taa on reserved stripes, teal courts chip, Lalezar title, gold disc, sticky bar, bdi, logical properties).
Deterministic: route dir 0 findings; components 11 advisory in ShortFilmDetail.module.css (10 font sizes off ramp: 14/13/12/10px + hero glyph clamp; 1 radius 11px). Overlay: overused-font (Inter 99%) on every page; line-length ~87–89ch on hero synopsis and detail synopsis; undersized-ui-text ×5 on 10px related-card genre badge; repeating-stripes-gradient. False positives: stripes (DESIGN.md reserved artwork), hero glyph clamp, Inter (documented body face). True: 10px badge, synopsis measure, size/radius drift.

## Priority Issues

1. [P0] Prototype mounted on /shorts — ShortsShowcase instead of ShortsDirectory: French-only, ratings, dead genre cloud, decorative mute, prototype back-link, physical left/right, 16:9 cards. Fix: mount ShortsDirectory, delete ShortsShowcase. (/impeccable shape → polish)
2. [P0] Ratings and mock data read as real — star scores on hero, rails, detail related rail, card, filters sort/slider; award counts from mock. Fix: remove rating display/sort/filter; mark mock-fed routes or keep unlinked. (/impeccable distill)
3. [P1] Gold on non-actions + triple watch CTA — featured badge, Lauréat badges, rating chips, aria-hidden card pill are gold; detail shows disc + action CTA + sticky CTA at once on phone. Fix: neutral featured chip; sticky bar only after action row scrolls out. (/impeccable quieter)
4. [P1] Detail action row breaks at 390px FR — "Regarder le film" wraps to two lines, narrower than "Bande-annonce". Fix: stack under ~400px, primary full-width. (/impeccable adapt)
5. [P2] Hero art + type drift — YouTube maxresdefault stills with burned-in subtitles collide with the Lalezar title; 10px badge below floor; synopsis 89ch. Fix: curated crops/object-position, 11px badge, cap measure ~65ch. (/impeccable typeset)

## Persona Red Flags

Casey: 85vh hero pushes first card below fold; carousel advances while reading; broken images; /fr/ links pay a 307 on every tap (showcase, detail related links, back fallback); heart loses saves.
Sam: H1 changes every 8s; duplicate H3 per card, run-together link text; scroll arrows invisible on focus; English aria labels on FR/AR; dead mute toggle; autoplay continues under focus.
Jordan: no header/logo/nav; no catalogue framing; "Regarder" doesn't play; dead genre pills; same films repeat; "PG12" unexplained; teal used as availability status in sticky bar.
Tiween visitor (Arabic, phone): lands on French copy with reversed numbers — reads as "not for me".

## Minor Observations

Page title "| Tiween | Tiween"; Arabic detail shows French synopsis (needs locale-fallback policy); desktop action CTA ~640px wide; broken related image alt overlaps badge; ShortsHero inset vignette + drop-shadow vs Flat Chrome; SuggestionForm gold trigger competes with discovery; card mobile "Regarder" gold-tint on a navigation-only card; fixed full-viewport grain layer; Phosphor vs Lucide icons.

## Questions to Consider

- Why open on a backdrop carousel at all? What would an edition-style "this week's programme" opening look like?
- With ~10 launch films, is a five-rail browse honest, or should v1 be one 2:3 poster grid with genre/duration chips?
- Is the product moment the hand-off to YouTube, or the credits and "why this film" before it?
