/**
 * PublishBar
 *
 * Status, publish and unpublish for ONE locale of a work (plan 01-09, D-22).
 * For a short film it also lists what the D-19 rules still miss, computed by
 * the parent with the same evaluator the server publish guard uses. The list
 * is advisory: the server re-evaluates the stored draft on every publish, so a
 * stale or modified client can never publish an incomplete film.
 */

import { Badge, Box, Button, Flex, Typography } from "@strapi/design-system"

import type { ShortFilmRuleResult } from "../../../../../../shared/short-film-rules"
import type { WorkStatus } from "../../hooks/useCreativeWorks"

import { useCatalogT } from "../Catalog/i18n"
import { publishIssueMessage } from "./publishRules"

interface PublishBarProps {
  status: WorkStatus | undefined
  /** Pre-check of the saved draft; `null` for works that have no rules */
  ruleResult: ShortFilmRuleResult | null
  /** Label of the locale being published, shown in the helper line */
  localeLabel: string
  isBusy: boolean
  onPublish: () => void
  onUnpublish: () => void
}

const STATUS_BADGE: Record<
  WorkStatus,
  { variant: "neutral" | "success" | "warning"; key: string; label: string }
> = {
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

export function PublishBar({
  status,
  ruleResult,
  localeLabel,
  isBusy,
  onPublish,
  onUnpublish,
}: PublishBarProps) {
  const t = useCatalogT()

  const badge = STATUS_BADGE[status ?? "draft"]
  const blocked = ruleResult !== null && !ruleResult.ok
  const canUnpublish = status === "published" || status === "modified"

  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      padding={4}
      marginBottom={4}
      data-testid="publish-bar"
    >
      <Flex
        justifyContent="space-between"
        alignItems="center"
        gap={4}
        wrap="wrap"
      >
        <Flex gap={3} alignItems="center">
          <Badge variant={badge.variant}>{t(badge.key, badge.label)}</Badge>
          <Typography variant="omega" fontWeight="bold">
            {localeLabel}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {t(
              "publish.scope",
              "Publishing applies to this language and is checked against the saved draft."
            )}
          </Typography>
        </Flex>

        <Flex gap={2}>
          {canUnpublish && (
            <Button
              variant="secondary"
              disabled={isBusy}
              onClick={() => {
                if (!isBusy) onUnpublish()
              }}
            >
              {t("publish.unpublish", "Unpublish")}
            </Button>
          )}
          <Button
            disabled={isBusy || blocked}
            loading={isBusy}
            onClick={() => {
              if (!isBusy && !blocked) onPublish()
            }}
          >
            {t("publish.publish", "Publish")}
          </Button>
        </Flex>
      </Flex>

      {ruleResult && ruleResult.issues.length > 0 && (
        <Box paddingTop={3} data-testid="publish-issues">
          <Typography variant="omega" fontWeight="bold" textColor="danger600">
            {t("publish.missingTitle", "Before publishing")}
          </Typography>
          <Flex
            direction="column"
            alignItems="flex-start"
            gap={1}
            paddingTop={1}
          >
            {ruleResult.issues.map((issue) => (
              <Typography
                key={issue.code}
                variant="omega"
                textColor="danger600"
              >
                {publishIssueMessage(issue.code, t)}
              </Typography>
            ))}
          </Flex>
        </Box>
      )}

      {ruleResult && ruleResult.warnings.length > 0 && (
        <Box paddingTop={3} data-testid="publish-warnings">
          <Flex direction="column" alignItems="flex-start" gap={1}>
            {ruleResult.warnings.map((warning) => (
              <Typography
                key={warning.code}
                variant="omega"
                textColor="warning600"
              >
                {publishIssueMessage(warning.code, t)}
              </Typography>
            ))}
          </Flex>
        </Box>
      )}
    </Box>
  )
}
