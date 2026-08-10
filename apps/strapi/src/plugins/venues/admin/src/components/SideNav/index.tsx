/**
 * The venues plugin's left navigation (Story 2D.2, S0).
 *
 * Two links, Lieux and Propriétés, matching the design kit's shell. Propriétés
 * is HIDDEN without the `manage-all` capability (AC 7): the property vocabulary
 * is platform-wide configuration, not something a single venue's manager edits.
 * Hiding it is convenience — the 2D.3 routes will carry their own server-side
 * check — but a nav link to a page that always 403s is worse than no link.
 */
import { Divider, Flex } from "@strapi/design-system"
import { SubNav } from "@strapi/strapi/admin"
import { useIntl } from "react-intl"

import { useVenuePermissions } from "../../hooks/useVenuePermissions"
import { PLUGIN_ID } from "../../pluginId"
import { getTranslation } from "../../utils/getTranslation"

export function SideNav() {
  const { formatMessage } = useIntl()
  const { canManageAll } = useVenuePermissions()
  const basePath = `/plugins/${PLUGIN_ID}`

  const links = [
    { to: "venues", labelKey: "sidenav.venues" },
    ...(canManageAll
      ? [{ to: "properties", labelKey: "sidenav.properties" }]
      : []),
  ]

  return (
    <SubNav.Main>
      <SubNav.Header
        label={formatMessage({ id: getTranslation("sidenav.title") })}
      />
      <Divider />
      <SubNav.Content>
        {/*
          `tag="nav"` + `alignItems="stretch"` mirrors the events-manager
          SideNav, minus its `styled-components` padding wrapper: DS spacing
          props do the same job and `styled-components` is on the never-use list.
        */}
        <Flex
          tag="nav"
          direction="column"
          alignItems="stretch"
          gap={1}
          paddingTop={4}
          paddingBottom={4}
          paddingLeft={2}
          paddingRight={2}
        >
          {links.map((link) => (
            <SubNav.Link
              key={link.to}
              to={`${basePath}/${link.to}`}
              label={formatMessage({ id: getTranslation(link.labelKey) })}
            />
          ))}
        </Flex>
      </SubNav.Content>
    </SubNav.Main>
  )
}
