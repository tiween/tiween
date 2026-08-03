/**
 * `@tiween/western-numerals` — the mechanical guard behind the project rule
 * "Arabic must render Western numerals" (`project-context.md:110`, `:173`).
 *
 * Why static and not runtime: on Node 22 / ICU 77 both `ar` and `ar-TN` resolve
 * to `numberingSystem: latn`, so a runtime assertion passes even when the code
 * is wrong — the same code renders `٣` on an ICU/CLDR build where `ar` defaults
 * to `arab`. Only the *shape of the locale argument* is a guarantee, so the
 * guard reads the AST instead of the output.
 *
 * The rule is fail-closed: a locale expression passes only when it is
 *   (a) a string literal (or expression-free template) whose primary language
 *       subtag is in `allowedLanguageSubtags`,
 *   (b) a literal/template whose static text *ends with* `-u-nu-latn` (this
 *       works through interpolation: `` `${locale}-u-nu-latn` `` passes while
 *       `` `${locale}-TN` `` and `` `-u-nu-latn${locale}` `` do not), or
 *   (c) a direct call to one of `safeLocaleHelpers`.
 * Anything else — a bare identifier, a ternary, a member expression, or a
 * *missing* locale argument — is reported. An explicit non-`latn` numbering
 * system is rejected wherever it appears: in the tag (`"fr-u-nu-arab"`, whose
 * primary subtag would otherwise be allowlisted) or in the options bag
 * (`{ numberingSystem: "arab" }`, which overrides the tag at runtime). `Intl`
 * is recognised bare and off a global (`globalThis.Intl`, `window.Intl`).
 *
 * Known limits, accepted: the rule reads syntax, not bindings, so it cannot see
 * through an aliased constructor (`const { NumberFormat } = Intl`), a `.call` /
 * `.bind` receiver, or a locally shadowed helper of the same name — and it
 * trusts `safeLocaleHelpers` by name without resolving the import. It targets
 * accidental recurrence of the 5.4 / 5.5 defects, not deliberate evasion.
 *
 * Plain ESLint rule object (no `@typescript-eslint/utils`): the shared config
 * package must not grow a new third-party dependency for this.
 */

/** `Intl.*` constructors whose output is numbering-system sensitive. */
const INTL_CONSTRUCTORS = new Set([
  "NumberFormat",
  "DateTimeFormat",
  "RelativeTimeFormat",
  "PluralRules",
  "ListFormat",
  "DurationFormat",
])

/**
 * Locale-sensitive display methods. Matched by member name alone, so the rule
 * also fires on non-`Intl` receivers — that is the intended bias: every such
 * call is locale-dependent display formatting.
 */
const TO_LOCALE_METHODS = new Set([
  "toLocaleString",
  "toLocaleDateString",
  "toLocaleTimeString",
])

const DEFAULT_ALLOWED_LANGUAGE_SUBTAGS = ["fr", "en"]
const DEFAULT_SAFE_LOCALE_HELPERS = ["toNumeralSafeLocale"]

/** Strip TS-only wrappers so `locale as string` is judged on `locale`. */
function unwrap(node) {
  let current = node
  while (
    current &&
    (current.type === "TSAsExpression" ||
      current.type === "TSSatisfiesExpression" ||
      current.type === "TSNonNullExpression" ||
      current.type === "TSTypeAssertion")
  ) {
    current = current.expression
  }
  return current
}

/**
 * The statically known text of a locale expression.
 *
 * `complete` is false for a template literal that still has interpolations —
 * its quasis are known, but the whole string is not, so only the `-u-nu-latn`
 * check may be trusted on it.
 */
function staticParts(node) {
  if (node.type === "Literal" && typeof node.value === "string") {
    return { text: node.value, complete: true }
  }
  if (node.type === "TemplateLiteral") {
    return {
      text: node.quasis.map((quasi) => quasi.value.cooked ?? "").join(""),
      complete: node.expressions.length === 0,
    }
  }
  return null
}

/**
 * Property name of a member expression, for `a.b` and `a["b"]` alike.
 *
 * Resolving the computed-with-string-literal form matters: without it
 * `Intl["NumberFormat"](locale)` and `d["toLocaleDateString"](locale)` walk
 * straight past the guard.
 */
function memberName(member) {
  if (member.type !== "MemberExpression") return null
  if (!member.computed && member.property.type === "Identifier") {
    return member.property.name
  }
  if (
    member.computed &&
    member.property.type === "Literal" &&
    typeof member.property.value === "string"
  ) {
    return member.property.value
  }
  return null
}

/** Name of a call's callee for `helper(x)` and `mod.helper(x)` alike. */
function calleeName(node) {
  const callee = unwrap(node.callee)
  if (!callee) return null
  if (callee.type === "Identifier") return callee.name
  return memberName(callee)
}

/**
 * Does the statically known tail of the tag end in `-u-nu-latn`?
 *
 * Anchored on purpose: a bare `includes` accepts `` `-u-nu-latn${locale}` ``,
 * where the extension is not the tag's numbering system at all.
 */
function endsWithLatn(node) {
  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value.toLowerCase().endsWith("-u-nu-latn")
  }
  if (node.type === "TemplateLiteral") {
    const last = node.quasis[node.quasis.length - 1]
    return (last?.value.cooked ?? "").toLowerCase().endsWith("-u-nu-latn")
  }
  return false
}

/** An explicit numbering system other than `latn` — the thing we forbid. */
const NON_LATN_EXTENSION = /-u-nu-(?!latn\b)/i

function isSafeLocale(argument, options) {
  const node = unwrap(argument)
  if (!node) return false

  const parts = staticParts(node)
  if (parts !== null) {
    // Checked before the allowlist: `"fr-u-nu-arab"` has an allowlisted primary
    // subtag yet explicitly requests Arabic-Indic digits.
    if (NON_LATN_EXTENSION.test(parts.text)) return false
    if (endsWithLatn(node)) return true
    if (!parts.complete) return false
    const primarySubtag = parts.text.split("-")[0].toLowerCase()
    return options.allowedLanguageSubtags.includes(primarySubtag)
  }

  if (node.type === "CallExpression") {
    const name = calleeName(node)
    return name !== null && options.safeLocaleHelpers.includes(name)
  }

  return false
}

/**
 * A literal `numberingSystem` in the options bag overrides the locale's
 * extension at runtime, so `Intl.NumberFormat(safe(l), {numberingSystem:"arab"})`
 * would otherwise be a lint-clean reintroduction of the defect. Only a statically
 * known value is judged — a string literal or an expression-free template; a
 * dynamic value or options object is left to the locale check.
 */
function unsafeNumberingSystem(optionsArgument) {
  if (!optionsArgument) return null
  const node = unwrap(optionsArgument)
  if (!node || node.type !== "ObjectExpression") return null
  for (const property of node.properties) {
    if (property.type !== "Property" || property.computed) continue
    const key =
      property.key.type === "Identifier"
        ? property.key.name
        : property.key.type === "Literal"
          ? property.key.value
          : null
    if (key !== "numberingSystem") continue
    // A string literal *or* an expression-free template: `` `arab` `` is the
    // same request as `"arab"`, and reading only `Literal` let it through.
    const value = unwrap(property.value)
    const parts = staticParts(value)
    if (
      parts !== null &&
      parts.complete &&
      parts.text.toLowerCase() !== "latn"
    ) {
      return property
    }
  }
  return null
}

/** Global objects `Intl` can be reached through without aliasing it. */
const GLOBAL_OBJECTS = new Set(["globalThis", "window", "self"])

/** Does this expression denote the `Intl` namespace — bare or off a global? */
function isIntlNamespace(node) {
  if (!node) return false
  if (node.type === "Identifier") return node.name === "Intl"
  // `globalThis.Intl` / `window["Intl"]` — same namespace, one hop further out.
  return (
    node.type === "MemberExpression" &&
    node.object.type === "Identifier" &&
    GLOBAL_OBJECTS.has(node.object.name) &&
    memberName(node) === "Intl"
  )
}

/** Is this `Intl.<Guarded>` (as `new` or plain call)? */
function guardedIntlName(node) {
  const callee = unwrap(node.callee)
  if (
    !callee ||
    callee.type !== "MemberExpression" ||
    !isIntlNamespace(unwrap(callee.object))
  ) {
    return null
  }
  const name = memberName(callee)
  return name !== null && INTL_CONSTRUCTORS.has(name) ? name : null
}

/** Is this `<expr>.toLocale*String(...)`? */
function guardedMethodName(node) {
  const callee = unwrap(node.callee)
  if (!callee || callee.type !== "MemberExpression") return null
  const name = memberName(callee)
  return name !== null && TO_LOCALE_METHODS.has(name) ? name : null
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require a provably Western-numeral (latn) locale for every Intl formatter and toLocale*String call",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          allowedLanguageSubtags: {
            type: "array",
            items: { type: "string" },
            uniqueItems: true,
          },
          safeLocaleHelpers: {
            type: "array",
            items: { type: "string" },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unsafeLocale:
        "`{{api}}` receives a locale that is not provably Western-numeral. Arabic locales can default to the `arab` numbering system, which this project forbids. Wrap the expression in `toNumeralSafeLocale(...)`, or use a literal ending in `-u-nu-latn`.",
      missingLocale:
        "`{{api}}` is called with no locale, so it inherits the runtime default — which may render Arabic-Indic digits. Pass `toNumeralSafeLocale(locale)` explicitly.",
      unsafeNumberingSystem:
        '`{{api}}` requests a non-`latn` `numberingSystem`, which overrides the locale and renders non-Western digits. Remove it, or use `numberingSystem: "latn"`.',
    },
  },

  create(context) {
    const raw = context.options[0] ?? {}
    const options = {
      allowedLanguageSubtags: (
        raw.allowedLanguageSubtags ?? DEFAULT_ALLOWED_LANGUAGE_SUBTAGS
      ).map((subtag) => subtag.toLowerCase()),
      safeLocaleHelpers: raw.safeLocaleHelpers ?? DEFAULT_SAFE_LOCALE_HELPERS,
    }

    const check = (node, api) => {
      const offendingOption = unsafeNumberingSystem(node.arguments[1])
      if (offendingOption) {
        context.report({
          node: offendingOption,
          messageId: "unsafeNumberingSystem",
          data: { api },
        })
      }

      if (node.arguments.length === 0) {
        context.report({ node, messageId: "missingLocale", data: { api } })
        return
      }
      const localeArgument = node.arguments[0]
      // `f(...args)` — the locale cannot be read statically; fail closed.
      if (
        localeArgument.type !== "SpreadElement" &&
        isSafeLocale(localeArgument, options)
      ) {
        return
      }
      context.report({
        node: localeArgument,
        messageId: "unsafeLocale",
        data: { api },
      })
    }

    return {
      NewExpression(node) {
        const name = guardedIntlName(node)
        if (name) check(node, `Intl.${name}`)
      },
      CallExpression(node) {
        const intlName = guardedIntlName(node)
        if (intlName) {
          check(node, `Intl.${intlName}`)
          return
        }
        const methodName = guardedMethodName(node)
        if (methodName) check(node, methodName)
      },
    }
  },
}

export default rule
