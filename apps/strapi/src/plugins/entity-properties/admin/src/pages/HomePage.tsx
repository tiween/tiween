/**
 * HomePage Component
 *
 * Overview landing page for the entity-properties plugin.
 */

import { Box, Main, Typography } from "@strapi/design-system"
import { Layouts } from "@strapi/strapi/admin"

const HomePage = () => {
  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title="Entity Properties"
          subtitle="Manage property definitions and categories for your venues"
        />
        <Layouts.Content>
          <Box padding={6}>
            <Typography variant="beta">
              Use the navigation to view categories and property definitions.
            </Typography>
          </Box>
        </Layouts.Content>
      </Main>
    </Layouts.Root>
  )
}

export { HomePage }
