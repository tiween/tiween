# DS Component-Binding Cheatsheet — Venues Plugin Admin

**For the implementing LLM.** Every screen element → the exact `@strapi/design-system`
(DS v2) component and the props that matter. If an element isn't here, find its DS
equivalent before reaching for native HTML. Pair this with the spines
([DESIGN.md](../DESIGN.md), [EXPERIENCE.md](../EXPERIENCE.md)) and the
[reference map](./reference-map.md).

Import surfaces:

- UI components → `@strapi/design-system`
- Icons → `@strapi/icons`
- Shell + admin hooks → `@strapi/strapi/admin` (`Layouts`, `useNotification`, `useFetchClient`, `unstable_useDocument` where relevant)

---

## 0. The "never use" list (auto-fail in DS review)

| ❌ Don't                                        | ✅ Use instead                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `<button>` / `<input>` / `<select>` / `<table>` | `Button` / `TextInput` / `SingleSelect` / `Table`                                           |
| Hardcoded hex (`#fff`, `rgb(...)`)              | DS token props (`backgroundColor="neutral0"`) or `var(--colors-<token>)` for raw SVG `fill` |
| `px` / `rem` / inline `style` layout            | DS numeric spacing props (`padding`, `gap`, `margin*`)                                      |
| `styled-components`                             | DS components + spacing/token props                                                         |
| deprecated `ModalLayout`                        | `Modal.Root/Content/Header/Body/Footer`                                                     |
| `alert()` / `window.confirm()`                  | `useNotification()` toast / `Dialog`                                                        |
| Input without a label wrapper                   | `Field.Root` → `Field.Label` + input + `Field.Error`/`Field.Hint`                           |
| Icon button without a label                     | `IconButton label="…"`                                                                      |
| Arabic-Indic numerals                           | Western numerals, dates `DD/MM/YYYY`                                                        |

---

## 1. Shell & navigation (S0)

| Element           | Component                                                                      | Notes                                   |
| ----------------- | ------------------------------------------------------------------------------ | --------------------------------------- |
| Page wrapper      | `Layouts.Root sideNav={<SideNav/>}`                                            | one per plugin; wraps `<Outlet/>`       |
| Page header       | `Layouts.Header title="…" primaryAction={<Button…/>}`                          | title + the page's main CTA             |
| Page body         | `Layouts.Content`                                                              | scrollable content region               |
| Side navigation   | `SubNav.*` (`SubNav.Main`, `SubNav.Sections`, `SubNav.Section`, `SubNav.Link`) | reuse events-manager `SideNav` shape    |
| Menu registration | `app.addMenuLink({ to, icon: Store, intlLabel, Component })`                   | already in `venues/admin/src/index.tsx` |
| Routing           | `react-router-dom` `<Routes>/<Route>` inside `PluginLayout`                    | mirror events-manager `App.tsx`         |
| Main landmark     | `Main` (wrap page content for a11y)                                            |                                         |

## 2. Venues list (S1)

| Element                     | Component                                                        | Notes                                     |
| --------------------------- | ---------------------------------------------------------------- | ----------------------------------------- |
| Search box                  | `Searchbar` inside `SearchForm`                                  | debounce 300ms with `use-debounce`        |
| Status / type / city filter | `SingleSelect` + `SingleSelectOption`                            | first option = "all" (`value=""`)         |
| Table                       | `Table` + `Thead`/`Tbody`/`Tr`/`Th`/`Td`                         | `colCount`/`rowCount` props for a11y      |
| Sortable header             | `Th` with a `Button`/`IconButton` toggling `CaretUp`/`CaretDown` | set `aria-sort` on active column          |
| Row select / select-all     | `Checkbox` (header = tri-state `'indeterminate'`)                |                                           |
| Status pill                 | `Badge backgroundColor textColor`                                | mapping in DESIGN.md; reuse `StatusBadge` |
| Row actions                 | `IconButton label` with `Pencil` / `Trash`                       | label required                            |
| Bulk actions                | a dropdown (`SimpleMenu` / `Menu.*`) → opens `Dialog`            | reuse `BulkActionsDropdown` shape         |
| Pagination                  | `Pagination` (+ `PageLink`, `Dots`, `PreviousLink`, `NextLink`)  | page size 20                              |
| Empty state                 | `EmptyStateLayout icon content action`                           | actionable CTA                            |
| Loading                     | `Loader`                                                         | center in `Layouts.Content`               |
| Hidden a11y text            | `VisuallyHidden`                                                 | for icon-only headers                     |

## 3. Venue form (S1) — `Modal` over a `<form>`

| Element            | Component                                                                                   | Notes                                    |
| ------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Modal shell        | `Modal.Root open onOpenChange` → `Modal.Content` → `Header`/`Body`/`Footer`                 | put a `<form onSubmit>` inside `Content` |
| Title              | `Modal.Title`                                                                               | "Nouveau lieu" / "Modifier {name}"       |
| Section heading    | `Typography variant="delta" fontWeight="bold"`                                              | one per section `Box`                    |
| Field wrapper      | `Field.Root error required name` → `Field.Label` + input + `Field.Error` + `Field.Hint`     | wrap EVERY input                         |
| Text / email / url | `TextInput`                                                                                 |                                          |
| Number             | `NumberInput`                                                                               | capacity                                 |
| Long text          | `Textarea`                                                                                  | description                              |
| Choice             | `SingleSelect` + `SingleSelectOption`                                                       | type, status, city                       |
| Two-up layout      | `Grid.Root gap={4}` + `Grid.Item col={6} s={12}`                                            | `col={12}` full width                    |
| Media              | existing `MediaInput`                                                                       | single (logo) / multiple (images)        |
| Map picker         | `Box`/`Field.Root` wrapping the map canvas + a "Localiser" `Button`                         | see § 6                                  |
| Submit / cancel    | `Modal.Footer` → `Modal.Close` `Button variant="tertiary"` + `Button type="submit" loading` |                                          |

## 4. Property authoring (S2)

| Element                               | Component                                              | Notes                      |
| ------------------------------------- | ------------------------------------------------------ | -------------------------- |
| Section tabs (Categories/Definitions) | `Tabs.Root/List/Trigger/Content`                       | or two SubNav links        |
| Category tree                         | indented `Box`/`Flex` rows, or `TreeView` if available | show child count + actions |
| Category / definition form            | `Modal.*` (as § 3)                                     |                            |
| Type select                           | `SingleSelect` (`boolean`/`integer`/`string`/`enum`)   |                            |
| Parent select                         | `SingleSelect` excluding self + descendants            | cycle-safe                 |
| enumOptions editor                    | repeatable `TextInput` rows + add/remove `IconButton`  | ≥1 required when type=enum |
| Locale switch                         | `SingleSelect` (AR/FR/EN) scoped to the form           | localized fields only      |
| Icon field                            | `TextInput` (icon name) or an icon picker              | stored as string           |
| Sort order                            | `NumberInput`                                          |                            |
| Delete guard                          | `Dialog` warns when children/definitions attached      | block orphaning            |

## 5. Property-value editor (S3) — inside the venue form

| Element           | Component                                         | Notes                         |
| ----------------- | ------------------------------------------------- | ----------------------------- |
| Group by category | `Accordion.Root` → `Accordion.Item` per category  | order by category `sortOrder` |
| Group header      | `Accordion.Header` → `Accordion.Trigger icon`     | category name + icon          |
| Group body        | `Accordion.Content` → `Box padding`               | definition rows               |
| Add property      | `SingleSelect`/combobox of unattached definitions | append a value row on pick    |
| **boolean** value | `Toggle`                                          | label = definition name       |
| **integer** value | `NumberInput`                                     |                               |
| **string** value  | `TextInput`                                       |                               |
| **enum** value    | `SingleSelect` from `definition.enumOptions`      |                               |
| Remove row        | `IconButton label="Retirer"` `Trash`              |                               |

## 6. The map picker (S1 — novel; see EXPERIENCE.md § Interaction Primitives)

- The map canvas is the **one sanctioned non-DS visual element**, kept inside DS chrome
  (`Box`/`Field.Root`). Provider TBD (OQ-1) — keep it swappable.
- Flow: address `TextInput` → "Localiser" `Button` → geocode → draggable pin → writes
  `geo.latitude`/`geo.longitude`. **No raw decimal entry.**
- A11y: also expose a non-pointer "Utiliser cette adresse" `Button` to confirm
  coordinates after geocode.
- Resolved coords may be shown read-only (`Typography`/disabled `TextInput`); never
  offered as editable decimals.

## 7. Confirmations & feedback (all surfaces)

| Element               | Component                                                                    | Notes                                                     |
| --------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------- | --------- | ------------------------ |
| Destructive confirm   | `Dialog.Root/Content/Header/Body/Footer` (+ `Dialog.Cancel`/`Dialog.Action`) | reuse `ConfirmDialog`; name scope ("Supprimer 2 lieux ?") |
| Success / error toast | `const { toggleNotification } = useNotification()`                           | `type: 'success'                                          | 'warning' | 'danger'`, brief message |
| Field error           | `Field.Error` (text from a mapped error CODE)                                | never render the raw code/backend prose                   |

---

## API binding rules (so the UI matches the contract)

- **Document Service API** via venues-plugin admin routes; use `documentId`, not `id`.
- **Zod-validate** inputs in the plugin; backend returns **error codes** — the UI maps
  each code to a translated `Field.Error`/toast string.
- **No response transformation** — read `data` directly (project-context rule).
- Mutations: confirm → mutate → `refetch` (no optimistic delete).
- Data hooks follow the existing `useVenuesEnhanced` shape (`useVenuesList`,
  `useVenueMutations`, `useVenue`).
