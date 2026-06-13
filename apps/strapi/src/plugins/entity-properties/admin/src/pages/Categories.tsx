/**
 * CategoriesPage Component
 *
 * Placeholder view for property categories.
 */

import { Box, Main, Typography } from "@strapi/design-system"
import { Layouts } from "@strapi/strapi/admin"

const CategoriesPage = () => {
  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title="Categories"
          subtitle="Organize property definitions by category"
        />
        <Layouts.Content>
          <Box padding={6}>
            <Typography variant="beta">
              Category management will appear here.
            </Typography>
          </Box>
        </Layouts.Content>
      </Main>
    </Layouts.Root>
  )
}

export { CategoriesPage }
