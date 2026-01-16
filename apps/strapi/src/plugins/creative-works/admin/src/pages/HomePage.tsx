import { Box, Typography } from "@strapi/design-system"

const HomePage = () => {
  return (
    <Box padding={8} background="neutral100">
      <Typography variant="alpha">Creative Works</Typography>
      <Box paddingTop={4}>
        <Typography variant="omega">
          Manage your content catalog - films, plays, concerts, people, and
          genres.
        </Typography>
      </Box>
    </Box>
  )
}

export { HomePage }
