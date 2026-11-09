import { cn } from "@/lib/utils"

/**
 * The frame a short film gets when its record carries no artwork: the
 * diagonal two-tone aubergine stripe from DESIGN.md ("reserved artwork instead
 * of a fake image") with a faint taa monogram. Decorative — the film's title is
 * always rendered as real text beside or over it.
 */
export function ReservedArtwork({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-0 flex items-center justify-center",
        "bg-[repeating-linear-gradient(115deg,var(--color-aubergine)_0,var(--color-aubergine)_14px,var(--color-surface)_14px,var(--color-surface)_28px)]",
        className
      )}
    >
      <span className="font-display text-gold-leaf/40 text-6xl leading-none select-none">
        ت
      </span>
    </div>
  )
}
