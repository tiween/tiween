/**
 * SideNav Component
 *
 * Navigation sidebar for the entity-properties plugin.
 */

import { Divider, Flex } from "@strapi/design-system"
import { SubNav } from "@strapi/strapi/admin"
import { useIntl } from "react-intl"
import { styled } from "styled-components"

import { PLUGIN_ID } from "../../pluginId"

interface NavItem {
  to: string
  labelKey: string
  defaultLabel: string
}

const NAV_ITEMS: NavItem[] = [
  {
    to: "home",
    labelKey: "entity-properties.sidenav.home",
    defaultLabel: "Overview",
  },
  {
    to: "definitions",
    labelKey: "entity-properties.sidenav.definitions",
    defaultLabel: "Definitions",
  },
  {
    to: "categories",
    labelKey: "entity-properties.sidenav.categories",
    defaultLabel: "Categories",
  },
]

const LinksContainer = styled(Flex)`
  padding: ${({ theme }) => theme.spaces[4]} ${({ theme }) => theme.spaces[2]};
`

export function SideNav() {
  const { formatMessage } = useIntl()
  const basePath = `/plugins/${PLUGIN_ID}`

  const title = formatMessage({
    id: "entity-properties.sidenav.title",
    defaultMessage: "Entity Properties",
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
              label={formatMessage({
                id: item.labelKey,
                defaultMessage: item.defaultLabel,
              })}
            />
          ))}
        </LinksContainer>
      </SubNav.Content>
    </SubNav.Main>
  )
}
