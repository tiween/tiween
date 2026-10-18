/**
 * LocaleTabs
 *
 * One tab per configured locale, default first, each with the status of that
 * language's row (D-22). The locale list always comes from the i18n plugin;
 * no code is hardcoded here. For a work that is not saved yet only the default
 * language can be edited, so the other tabs are disabled.
 */

import { Badge, Flex, Tabs } from "@strapi/design-system"

import type { LocaleInfo, WorkStatus } from "../../hooks/useCreativeWorks"

import { useCatalogT } from "../Catalog/i18n"

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

const STATUS_BADGE: Record<
  LocaleTabStatus,
  {
    variant: "neutral" | "success" | "warning" | "secondary"
    key: string
    label: string
  }
> = {
  missing: {
    variant: "secondary",
    key: "locales.status.missing",
    label: "Missing",
  },
  draft: { variant: "neutral", key: "publish.status.draft", label: "Draft" },
  published: {
    variant: "success",
    key: "publish.status.published",
    label: "Published",
  },
  modified: {
    variant: "warning",
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
                <Badge size="S" variant={badge.variant}>
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
