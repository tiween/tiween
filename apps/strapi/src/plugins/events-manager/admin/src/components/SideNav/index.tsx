/**
 * SideNav Component
 *
 * Vertical navigation sidebar for the events-manager plugin.
 * Uses Strapi Admin SubNav V2 components for consistent navigation styling.
 */

import { Divider, Flex } from "@strapi/design-system"
import { SubNav } from "@strapi/strapi/admin"
import { useIntl } from "react-intl"
import { styled } from "styled-components"

import { PLUGIN_ID } from "../../pluginId"

interface NavItem {
  to: string
  labelKey: string
}

const NAV_ITEMS: NavItem[] = [
  { to: "dashboard", labelKey: "events-manager.sidenav.dashboard" },
  { to: "planning", labelKey: "events-manager.sidenav.planning" },
  { to: "venues", labelKey: "events-manager.sidenav.venues" },
  { to: "import", labelKey: "events-manager.sidenav.import" },
]

const LinksContainer = styled(Flex)`
  padding: ${({ theme }) => theme.spaces[4]} ${({ theme }) => theme.spaces[2]};
`

export function SideNav() {
  const { formatMessage } = useIntl()
  const basePath = `/plugins/${PLUGIN_ID}`

  const title = formatMessage({
    id: "events-manager.sidenav.title",
    defaultMessage: "Events Manager",
  })

  return (
    <SubNav.Main>
      <SubNav.Header label={title} />
      <Divider />
      <SubNav.Content>
        <LinksContainer
          tag="nav"
          direction="column"
          alignItems="stretch"
          gap={1}
        >
          {NAV_ITEMS.map((item) => (
            <SubNav.Link
              key={item.to}
              to={`${basePath}/${item.to}`}
              label={formatMessage({ id: item.labelKey })}
            />
          ))}
        </LinksContainer>
      </SubNav.Content>
    </SubNav.Main>
  )
}
