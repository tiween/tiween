import { Box, Typography } from "@strapi/design-system"

const HomePage = () => {
  return (
    <Box padding={8} background="neutral100">
      <Typography variant="alpha">User Engagement</Typography>
      <Box paddingTop={4}>
        <Typography variant="omega">
          Track user watchlists, preferences, and engagement analytics.
        </Typography>
      </Box>
    </Box>
  )
}

export { HomePage }
