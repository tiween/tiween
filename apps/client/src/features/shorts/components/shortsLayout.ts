/**
 * Layout classes shared by every `/shorts` surface so loading, error and the
 * loaded directory keep one footprint (UI-SPEC "Spacing Scale", Part C1/C5).
 * Plan 08 makes `ShortsDirectory` import these instead of its local `GRID`.
 */

/** 2 / 3 / 4 / 5 / 6 columns at 0 / 640 / 768 / 1024 / 1280px, 16px gaps. */
export const SHORTS_GRID_CLASS =
  "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"

/**
 * Page container: 16px gutter under 768px and 24px from there, 1280px max.
 * Top rhythm (header to h1) 16 / 32 / 48 at 390 / 768 / 1280. Bottom clearance
 * is 64px plus the 64px bottom nav and the safe-area inset under 1024px, where
 * the nav shows; from 1024px it is the 64px base only.
 */
export const SHORTS_PAGE_CLASS =
  "mx-auto w-full max-w-[1280px] px-4 pt-4 pb-[calc(8rem+env(safe-area-inset-bottom))] md:px-6 md:pt-8 lg:pb-16 xl:pt-12"
