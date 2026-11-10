import axe from "axe-core"

/**
 * Accessibility assertion for component tests, built on axe-core (Phase 2,
 * UI-SPEC Part G).
 *
 * jsdom has no layout engine and cannot compute colours, so two rules are off
 * by default:
 * - `color-contrast`: needs real rendering. Contrast is a recorded manual pass
 *   (UI-SPEC Part G), not something a jsdom test can prove.
 * - `region`: a page-level rule ("all content inside a landmark") that fires on
 *   every isolated component fixture.
 *
 * Callers can override any rule through `options.rules`.
 */

type RuleConfig = { enabled: boolean }

export type ExpectNoA11yViolationsOptions = {
  /** Per-rule overrides, merged over the jsdom defaults. */
  rules?: Record<string, RuleConfig>
}

const JSDOM_DISABLED_RULES: Record<string, RuleConfig> = {
  "color-contrast": { enabled: false },
  region: { enabled: false },
}

function describeViolations(violations: axe.Result[]): string {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => `    - ${node.html}`)
        .join("\n")
      return `  [${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help}\n${nodes}`
    })
    .join("\n")
}

/**
 * Runs axe-core against `container` and throws when any violation is found.
 * The message lists each violating rule id, its impact and the offending HTML.
 */
export async function expectNoA11yViolations(
  container: Element,
  options: ExpectNoA11yViolationsOptions = {}
): Promise<void> {
  const results = await axe.run(container, {
    rules: { ...JSDOM_DISABLED_RULES, ...options.rules },
  })

  if (results.violations.length > 0) {
    throw new Error(
      `Expected no accessibility violations, found ${results.violations.length}:\n${describeViolations(results.violations)}`
    )
  }
}
