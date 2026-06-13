/**
 * DefinitionsPage Component
 *
 * Placeholder view for property definitions.
 */

import { Box, Main, Typography } from "@strapi/design-system"
import { Layouts } from "@strapi/strapi/admin"

const DefinitionsPage = () => {
  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title="Definitions"
          subtitle="Create and maintain property definitions"
        />
        <Layouts.Content>
          <Box padding={6}>
            <Typography variant="beta">
              Definition management will appear here.
            </Typography>
          </Box>
        </Layouts.Content>
      </Main>
    </Layouts.Root>
  )
}

export { DefinitionsPage }
