import { Badge, Flex, Tabs } from "@strapi/design-system"

import type { BadgeProps } from "@strapi/design-system"
import type { LocaleInfo, WorkStatus } from "../../hooks/useCreativeWorks"

import { useCatalogT } from "../Catalog/i18n"

/**
 * LocaleTabs
 *
 * One tab per configured locale, default first, each with the status of that
 * language's row (D-22). The locale list always comes from the i18n plugin;
 * no code is hardcoded here. For a work that is not saved yet only the default
 * language can be edited, so the other tabs are disabled.
 */

/** Status of one language: a stored row's status, or no row yet */
export type LocaleTabStatus = WorkStatus | "missing"

interface LocaleTabsProps {
  locales: LocaleInfo[]
  /** Code of the active locale */
  value: string
  /** Status per locale code; an absent entry reads as `missing` */
  statuses: Record<string, LocaleTabStatus | undefined>
  /** True while the work is unsaved: only the default locale stays enabled */
  disableTranslations: boolean
  onChange: (code: string) => void
}

/**
 * Badge colours per status. Modified sets its colours directly: the DS
 * `variant="warning"` draws warning700 on warning200 (3.6:1, fails WCAG AA at
 * 11px) and ignores `textColor`. See apps/strapi/DESIGN.md, Chips.
 */
const STATUS_BADGE: Record<
  LocaleTabStatus,
  {
    colors: Pick<BadgeProps, "variant" | "backgroundColor" | "textColor">
    key: string
    label: string
  }
> = {
  missing: {
    colors: { variant: "secondary" },
    key: "locales.status.missing",
    label: "Missing",
  },
  draft: {
    colors: { variant: "neutral" },
    key: "publish.status.draft",
    label: "Draft",
  },
  published: {
    colors: { variant: "success" },
    key: "publish.status.published",
    label: "Published",
  },
  modified: {
    colors: { backgroundColor: "warning200", textColor: "neutral800" },
    key: "publish.status.modified",
    label: "Modified",
  },
}

export function LocaleTabs({
  locales,
  value,
  statuses,
  disableTranslations,
  onChange,
}: LocaleTabsProps) {
  const t = useCatalogT()

  return (
    <Tabs.Root value={value} onValueChange={onChange} variant="simple">
      <Tabs.List aria-label={t("locales.label", "Languages")}>
        {locales.map((locale) => {
          const badge = STATUS_BADGE[statuses[locale.code] ?? "missing"]
          return (
            <Tabs.Trigger
              key={locale.code}
              value={locale.code}
              disabled={disableTranslations && !locale.isDefault}
            >
              <Flex tag="span" gap={2} alignItems="center">
                {locale.name}
                <Badge size="S" {...badge.colors}>
                  {t(badge.key, badge.label)}
                </Badge>
              </Flex>
            </Tabs.Trigger>
          )
        })}
      </Tabs.List>
    </Tabs.Root>
  )
}
