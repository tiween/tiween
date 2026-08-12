---
type: domain
title: Arabic renders Western numerals
description: The Tunisian date and numeral convention and how it is implemented
tags: [i18n, arabic]
verified: 2026-08-12
sources: [apps/client/src/lib/dates.ts, apps/client/src/lib/intl-locale.ts]
---

Tunisian convention is Western (Latin) digits in Arabic text: `25/12/2025`, never
`٢٥/١٢/٢٠٢٥`. Dates are `DD/MM/YYYY` in all three locales.

`apps/client/src/lib/dates.ts` implements this by formatting Arabic through the `fr`
locale rather than `ar`. `apps/client/src/lib/intl-locale.ts` forces the `latn`
numbering system for `Intl.RelativeTimeFormat`, which does not route through the date
formatter.

Any new formatter reaching for `Intl` with a raw `ar` locale will emit Arabic-Indic
digits and is wrong. RTL direction is separate and handled by next-intl.
