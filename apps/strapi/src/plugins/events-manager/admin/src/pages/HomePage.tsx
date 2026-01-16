import { useState } from "react"
import { Box, Button, Main, Tabs } from "@strapi/design-system"
import { Calendar, Database, House, Upload } from "@strapi/icons"
import { Layouts, useFetchClient, useNotification } from "@strapi/strapi/admin"

import { ImportTab } from "../components/ImportTab"
import { PlanningTab } from "../components/PlanningTab"
import { VenuesPage } from "./Venues"

const HomePage = () => {
  const { post } = useFetchClient()
  const { toggleNotification } = useNotification()
  const [isSeeding, setIsSeeding] = useState(false)

  const handleSeedData = async () => {
    setIsSeeding(true)
    try {
      const response = await post("/events-manager/seed", {})
      const data = response.data as {
        data: {
          venues: { created: number; skipped: number }
          eventGroups: { created: number; skipped: number }
        }
      }

      toggleNotification({
        type: "success",
        message: `Seeded ${data.data.venues.created} venues and ${data.data.eventGroups.created} event groups`,
      })

      // Reload the page to refresh data
      window.location.reload()
    } catch (err) {
      toggleNotification({
        type: "danger",
        message: "Failed to seed data. Check console for details.",
      })
      console.error("Seed error:", err)
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title="Events Manager"
          subtitle="Schedule events and manage showtimes for your venues"
          primaryAction={
            <Button
              startIcon={<Database />}
              onClick={handleSeedData}
              loading={isSeeding}
              variant="secondary"
            >
              Seed Demo Data
            </Button>
          }
        />
        <Layouts.Content>
          <Box padding={6}>
            <Tabs.Root defaultValue="planning">
              <Tabs.List aria-label="Events Manager tabs">
                <Tabs.Trigger value="planning">
                  <Box paddingRight={2} style={{ display: "inline-flex" }}>
                    <Calendar width={16} height={16} />
                  </Box>
                  Planning
                </Tabs.Trigger>
                <Tabs.Trigger value="venues">
                  <Box paddingRight={2} style={{ display: "inline-flex" }}>
                    <House width={16} height={16} />
                  </Box>
                  Lieux
                </Tabs.Trigger>
                <Tabs.Trigger value="import">
                  <Box paddingRight={2} style={{ display: "inline-flex" }}>
                    <Upload width={16} height={16} />
                  </Box>
                  Import
                </Tabs.Trigger>
              </Tabs.List>

              <Box paddingTop={6}>
                <Tabs.Content value="planning">
                  <PlanningTab />
                </Tabs.Content>

                <Tabs.Content value="venues">
                  <VenuesPage />
                </Tabs.Content>

                <Tabs.Content value="import">
                  <ImportTab />
                </Tabs.Content>
              </Box>
            </Tabs.Root>
          </Box>
        </Layouts.Content>
      </Main>
    </Layouts.Root>
  )
}

export { HomePage }
