/**
 * The Propriétés surface (S2) — a PLACEHOLDER.
 *
 * Story 2D.2 owns the shell and the venue list/form; the property-category and
 * property-definition authoring UI is story 2D.3. The nav link exists so the
 * shell matches the design kit, and the page says what it is waiting for rather
 * than rendering a half-built editor.
 *
 * It is only reachable with the `manage-all` capability (the `SideNav` hides
 * the link otherwise).
 */
import { EmptyStateLayout, Main } from "@strapi/design-system"
import { Cog } from "@strapi/icons"
import { Layouts } from "@strapi/strapi/admin"
import { useIntl } from "react-intl"

import { getTranslation } from "../../utils/getTranslation"

export function PropertiesPage() {
  const { formatMessage } = useIntl()
  const t = (id: string) => formatMessage({ id: getTranslation(id) })

  return (
    <Main>
      <Layouts.Header
        title={t("pages.properties.title")}
        subtitle={t("pages.properties.subtitle")}
      />
      <Layouts.Content>
        <EmptyStateLayout
          icon={<Cog width="10rem" height="10rem" />}
          content={t("pages.properties.deferred")}
        />
      </Layouts.Content>
    </Main>
  )
}
