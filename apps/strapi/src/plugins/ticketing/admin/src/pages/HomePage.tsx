import { Box, Typography } from "@strapi/design-system"

const HomePage = () => {
  return (
    <Box padding={8} background="neutral100">
      <Typography variant="alpha">Ticketing</Typography>
      <Box paddingTop={4}>
        <Typography variant="omega">
          Manage ticket orders, validate tickets, and track sales.
        </Typography>
      </Box>
    </Box>
  )
}

export { HomePage }
