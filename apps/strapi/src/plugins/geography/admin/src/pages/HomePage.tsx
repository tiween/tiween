import { Box, Typography } from "@strapi/design-system"

const HomePage = () => {
  return (
    <Box padding={8} background="neutral100">
      <Typography variant="alpha">Geography</Typography>
      <Box paddingTop={4}>
        <Typography variant="omega">
          Manage regions and cities for venue locations.
        </Typography>
      </Box>
    </Box>
  )
}

export { HomePage }
