import { describe, it } from "node:test"

import { RuleTester } from "eslint"

import rule from "./western-numerals.mjs"

/**
 * `node --test` + ESLint's own `RuleTester`. `RuleTester` delegates to whatever
 * `describe`/`it` it is handed, so wiring `node:test`'s pair here keeps the
 * suite dependency-free — no new third-party test runner in the shared config
 * package (the story forbids one).
 *
 * Every row of the story's I/O & Edge-Case Matrix is covered, plus one case per
 * guarded API.
 */
RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
})

ruleTester.run("western-numerals", rule, {
  valid: [
    // (a) allowlisted literal locale — one per guarded API.
    { code: 'new Intl.NumberFormat("fr-TN").format(1)' },
    { code: 'new Intl.DateTimeFormat("fr-TN", { day: "numeric" })' },
    { code: 'new Intl.RelativeTimeFormat("en", { numeric: "auto" })' },
    { code: 'new Intl.PluralRules("en-CA")' },
    { code: 'new Intl.ListFormat("fr")' },
    { code: 'Intl.NumberFormat("en-CA").format(1)' },
    { code: 'd.toLocaleDateString("en-CA", { month: "short" })' },
    { code: 'd.toLocaleTimeString("fr-TN")' },
    { code: 'n.toLocaleString("fr-TN")' },
    // Case-insensitive primary subtag, and a bare language tag.
    { code: 'n.toLocaleString("FR")' },

    // (b) explicit `-u-nu-latn`, both as a literal and through interpolation.
    { code: 'new Intl.NumberFormat("ar-u-nu-latn").format(1)' },
    {
      code: "new Intl.DateTimeFormat(`${locale}-u-nu-latn`, { day: '2-digit' })",
    },
    { code: "d.toLocaleDateString(`${locale}-u-nu-latn`)" },
    // Expression-free template with an allowlisted subtag.
    { code: "n.toLocaleString(`fr-TN`)" },

    // (c) allowlisted helper call, bare and namespaced.
    { code: "new Intl.NumberFormat(toNumeralSafeLocale(locale)).format(1)" },
    {
      code: "d.toLocaleTimeString(toNumeralSafeLocale(locale), { hour: '2-digit' })",
    },
    { code: "d.toLocaleDateString(intl.toNumeralSafeLocale(locale))" },
    {
      code: "new Intl.NumberFormat(toNumeralSafeLocale(locale)).format(1)",
      options: [{ safeLocaleHelpers: ["toNumeralSafeLocale"] }],
    },

    // An explicit `latn` options bag is fine (it agrees with the invariant).
    {
      code: 'new Intl.NumberFormat(toNumeralSafeLocale(l), { numberingSystem: "latn" })',
    },
    // A dynamic options bag is left to the locale check — no false positive.
    { code: "new Intl.NumberFormat(toNumeralSafeLocale(l), opts)" },
    // A `latn` template in the options bag agrees with the invariant too.
    {
      code: "new Intl.NumberFormat(toNumeralSafeLocale(l), { numberingSystem: `latn` })",
    },
    // An interpolated `numberingSystem` is not statically known — left to the
    // locale check, like any other dynamic options value.
    {
      code: "new Intl.NumberFormat(toNumeralSafeLocale(l), { numberingSystem: `${ns}` })",
    },
    // `Intl` reached off a global object, with a safe locale, still passes.
    { code: 'new globalThis.Intl.NumberFormat("fr-TN").format(1)' },
    // Computed access with a safe locale still resolves, and still passes.
    { code: 'new Intl["NumberFormat"]("fr-TN").format(1)' },
    // Options are honoured: a custom allowlist widens (a).
    {
      code: 'new Intl.NumberFormat("de-DE").format(1)',
      options: [{ allowedLanguageSubtags: ["de"] }],
    },
    {
      code: "new Intl.NumberFormat(safeLocale(l)).format(1)",
      options: [{ safeLocaleHelpers: ["safeLocale"] }],
    },

    // Not a guarded API.
    { code: "new Intl.Collator(locale)" },
    { code: "new Intl.Segmenter(locale)" },
    { code: "n.toString(locale)" },
  ],

  invalid: [
    // Raw dynamic locale — the verbatim story-5.4 defect, one per guarded API.
    {
      code: "new Intl.NumberFormat(locale).format(1)",
      errors: [{ messageId: "unsafeLocale" }],
    },
    {
      code: "new Intl.DateTimeFormat(locale, { day: 'numeric' })",
      errors: [{ messageId: "unsafeLocale" }],
    },
    {
      code: "new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })",
      errors: [{ messageId: "unsafeLocale" }],
    },
    {
      code: "new Intl.PluralRules(locale)",
      errors: [{ messageId: "unsafeLocale" }],
    },
    {
      code: "new Intl.ListFormat(locale)",
      errors: [{ messageId: "unsafeLocale" }],
    },
    {
      code: "Intl.NumberFormat(locale).format(1)",
      errors: [{ messageId: "unsafeLocale" }],
    },
    {
      code: "d.toLocaleDateString(locale, { weekday: 'short' })",
      errors: [{ messageId: "unsafeLocale" }],
    },
    {
      code: "d.toLocaleTimeString(locale)",
      errors: [{ messageId: "unsafeLocale" }],
    },
    {
      code: "n.toLocaleString(locale)",
      errors: [{ messageId: "unsafeLocale" }],
    },

    // Unsafe literal locale — `ar` is not allowlisted and carries no `-u-nu-latn`.
    {
      code: 'd.toLocaleDateString("ar-TN")',
      errors: [{ messageId: "unsafeLocale" }],
    },
    {
      code: 'new Intl.NumberFormat("ar").format(1)',
      errors: [{ messageId: "unsafeLocale" }],
    },
    // …including an explicitly *arab* numbering system.
    {
      code: 'new Intl.NumberFormat("ar-u-nu-arab").format(1)',
      errors: [{ messageId: "unsafeLocale" }],
    },

    // Ternary — not a provably safe form even when every branch looks fine.
    {
      code: 'd.toLocaleTimeString(l === "ar" ? "ar-TN" : l)',
      errors: [{ messageId: "unsafeLocale" }],
    },
    {
      code: 'd.toLocaleTimeString(l === "ar" ? "fr-TN" : "en-US")',
      errors: [{ messageId: "unsafeLocale" }],
    },

    // Template with an interpolation but no `-u-nu-latn`.
    {
      code: "new Intl.DateTimeFormat(`${locale}-TN`)",
      errors: [{ messageId: "unsafeLocale" }],
    },

    // Member expression / non-allowlisted helper call.
    {
      code: "new Intl.NumberFormat(props.locale).format(1)",
      errors: [{ messageId: "unsafeLocale" }],
    },
    {
      code: "new Intl.NumberFormat(resolveLocale(l)).format(1)",
      errors: [{ messageId: "unsafeLocale" }],
    },
    // The helper allowlist is an option, so a renamed allowlist re-closes it.
    {
      code: "new Intl.NumberFormat(toNumeralSafeLocale(l)).format(1)",
      options: [{ safeLocaleHelpers: ["safeLocale"] }],
      errors: [{ messageId: "unsafeLocale" }],
    },
    // …and a narrowed subtag allowlist re-closes the literal branch.
    {
      code: 'new Intl.NumberFormat("en-CA").format(1)',
      options: [{ allowedLanguageSubtags: ["fr"] }],
      errors: [{ messageId: "unsafeLocale" }],
    },

    // Spread — the locale cannot be read statically; fail closed.
    {
      code: "new Intl.NumberFormat(...args).format(1)",
      errors: [{ messageId: "unsafeLocale" }],
    },

    // Missing locale argument — falls back to the runtime default.
    {
      code: "count.toLocaleString()",
      errors: [{ messageId: "missingLocale" }],
    },
    {
      code: "d.toLocaleDateString()",
      errors: [{ messageId: "missingLocale" }],
    },
    {
      code: "d.toLocaleTimeString()",
      errors: [{ messageId: "missingLocale" }],
    },
    {
      code: "new Intl.NumberFormat()",
      errors: [{ messageId: "missingLocale" }],
    },
    {
      code: "new Intl.DateTimeFormat()",
      errors: [{ messageId: "missingLocale" }],
    },
    {
      code: "new Intl.RelativeTimeFormat()",
      errors: [{ messageId: "missingLocale" }],
    },
    {
      code: "new Intl.PluralRules()",
      errors: [{ messageId: "missingLocale" }],
    },
    {
      code: "new Intl.ListFormat()",
      errors: [{ messageId: "missingLocale" }],
    },

    // An allowlisted primary subtag must NOT license an explicit `arab`
    // numbering system — the extension is checked before the allowlist.
    {
      code: 'new Intl.NumberFormat("fr-u-nu-arab").format(1)',
      errors: [{ messageId: "unsafeLocale" }],
    },
    {
      code: 'd.toLocaleDateString("en-US-u-nu-arabext")',
      errors: [{ messageId: "unsafeLocale" }],
    },

    // The `-u-nu-latn` check is anchored to the end of the tag: the extension
    // has to *be* the tag's numbering system, not merely appear somewhere.
    {
      code: "new Intl.NumberFormat(`-u-nu-latn${locale}`).format(1)",
      errors: [{ messageId: "unsafeLocale" }],
    },
    {
      code: "new Intl.DateTimeFormat(`${locale}-u-nu-latn-${suffix}`)",
      errors: [{ messageId: "unsafeLocale" }],
    },

    // A literal `numberingSystem` in the options bag overrides the locale, so a
    // safe locale is not enough on its own.
    {
      code: 'new Intl.NumberFormat(toNumeralSafeLocale(l), { numberingSystem: "arab" })',
      errors: [{ messageId: "unsafeNumberingSystem" }],
    },
    {
      code: 'd.toLocaleDateString("fr-TN", { numberingSystem: "arab" })',
      errors: [{ messageId: "unsafeNumberingSystem" }],
    },
    // …and a template literal is the same request as a string literal.
    {
      code: "new Intl.NumberFormat(toNumeralSafeLocale(l), { numberingSystem: `arab` })",
      errors: [{ messageId: "unsafeNumberingSystem" }],
    },

    // Reaching `Intl` off a global object must not walk past the guard.
    {
      code: "new globalThis.Intl.NumberFormat(locale).format(1)",
      errors: [{ messageId: "unsafeLocale" }],
    },
    {
      code: 'window["Intl"].DateTimeFormat(locale)',
      errors: [{ messageId: "unsafeLocale" }],
    },
    {
      code: "new self.Intl.NumberFormat()",
      errors: [{ messageId: "missingLocale" }],
    },

    // Computed member access must not walk past the guard.
    {
      code: 'new Intl["NumberFormat"](locale).format(1)',
      errors: [{ messageId: "unsafeLocale" }],
    },
    {
      code: 'd["toLocaleDateString"](locale)',
      errors: [{ messageId: "unsafeLocale" }],
    },

    // `Intl.DurationFormat` renders digits too.
    {
      code: "new Intl.DurationFormat(locale)",
      errors: [{ messageId: "unsafeLocale" }],
    },
  ],
})

/**
 * The rule module is only half the guard — it protects nothing unless
 * `apps/client/eslint.config.mjs` still registers the plugin and sets the rule
 * to `error`. That wiring lives in a Storybook-generated file that `storybook
 * upgrade` rewrites, so losing it is a realistic accident that no RuleTester
 * case would notice. This check lints a fixture through the client's *own*
 * resolved flat config.
 */
describe("wiring", () => {
  it("is enabled as an error in apps/client's resolved config", async () => {
    const { ESLint } = await import("eslint")
    const { fileURLToPath } = await import("node:url")
    const { dirname, join } = await import("node:path")
    const assert = await import("node:assert/strict")

    const clientDir = join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "..",
      "apps",
      "client"
    )
    const eslint = new ESLint({ cwd: clientDir })
    const [result] = await eslint.lintText(
      "export const f = (locale) => new Intl.NumberFormat(locale).format(1)\n",
      { filePath: join(clientDir, "src", "__wiring-probe.ts") }
    )

    const hits = (result?.messages ?? []).filter(
      (message) => message.ruleId === "@tiween/western-numerals"
    )
    assert.default.equal(
      hits.length,
      1,
      `expected @tiween/western-numerals to fire, got: ${JSON.stringify(
        result?.messages
      )}`
    )
    assert.default.equal(
      hits[0].severity,
      2,
      "rule must be an error, not a warning"
    )
  })
})
