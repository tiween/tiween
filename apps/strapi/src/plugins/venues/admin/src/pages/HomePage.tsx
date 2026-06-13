import { Box, Typography } from "@strapi/design-system"

const HomePage = () => {
  return (
    <Box padding={8} background="neutral100">
      <Typography variant="alpha">Venues</Typography>
      <Box paddingTop={4}>
        <Typography variant="omega">
          Manage venues and their configurable properties.
        </Typography>
      </Box>
    </Box>
  )
}

export { HomePage }
