/**
 * DashboardPage Component
 *
 * Overview dashboard for the events-manager plugin showing key metrics,
 * recent activity, and quick actions. Uses Strapi DS components.
 */

import { useMemo } from "react"
import {
  Badge,
  Box,
  Button,
  Card,
  EmptyStateLayout,
  Flex,
  Grid,
  Loader,
  Main,
  Typography,
} from "@strapi/design-system"
import { ArrowRight, Clock, House, Play, Plus } from "@strapi/icons"
import { Layouts } from "@strapi/strapi/admin"
import { useNavigate } from "react-router-dom"

import { useEventGroups } from "../../hooks/useEventGroups"
import { useVenues } from "../../hooks/useVenues"
import { PLUGIN_ID } from "../../pluginId"

/** Stat Card Component */
interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  iconBackground?: string
  onClick?: () => void
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBackground = "primary100",
  onClick,
}: StatCardProps) {
  return (
    <Card
      padding={5}
      style={{ cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      <Flex gap={4} alignItems="flex-start">
        <Box
          background={iconBackground}
          padding={3}
          hasRadius
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </Box>
        <Box flex={1}>
          <Typography variant="pi" textColor="neutral600">
            {title}
          </Typography>
          <Typography variant="alpha" fontWeight="bold">
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="pi" textColor="neutral500">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Flex>
    </Card>
  )
}

/** Recent Venue Row */
interface RecentVenueProps {
  name: string
  type?: string
  status: "pending" | "approved" | "suspended"
}

function RecentVenueRow({ name, type, status }: RecentVenueProps) {
  const statusConfig = {
    pending: { label: "En attente", bg: "warning100", color: "warning700" },
    approved: { label: "Approuvé", bg: "success100", color: "success700" },
    suspended: { label: "Suspendu", bg: "danger100", color: "danger700" },
  }

  const config = statusConfig[status] || statusConfig.pending

  return (
    <Flex
      justifyContent="space-between"
      alignItems="center"
      paddingTop={3}
      paddingBottom={3}
      style={{ borderBottom: "1px solid var(--strapi-color-neutral200)" }}
    >
      <Box>
        <Typography fontWeight="semiBold">{name}</Typography>
        {type && (
          <Typography variant="pi" textColor="neutral500">
            {type}
          </Typography>
        )}
      </Box>
      <Badge backgroundColor={config.bg} textColor={config.color}>
        {config.label}
      </Badge>
    </Flex>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const basePath = `/plugins/${PLUGIN_ID}`

  const { venues, isLoading: venuesLoading } = useVenues()
  const { eventGroups, isLoading: eventGroupsLoading } = useEventGroups()

  const isLoading = venuesLoading || eventGroupsLoading

  // Calculate stats
  const stats = useMemo(() => {
    const approvedVenues = venues.filter((v) => v.status === "approved").length
    const pendingVenues = venues.filter((v) => v.status === "pending").length

    return {
      totalVenues: venues.length,
      approvedVenues,
      pendingVenues,
      totalEventGroups: eventGroups.length,
    }
  }, [venues, eventGroups])

  // Get recent venues (last 5)
  const recentVenues = useMemo(() => {
    return venues.slice(0, 5)
  }, [venues])

  if (isLoading) {
    return (
      <Layouts.Root>
        <Main>
          <Layouts.Header
            title="Tableau de bord"
            subtitle="Vue d'ensemble de vos événements et lieux"
          />
          <Layouts.Content>
            <Flex justifyContent="center" alignItems="center" paddingTop={10}>
              <Loader>Chargement des données...</Loader>
            </Flex>
          </Layouts.Content>
        </Main>
      </Layouts.Root>
    )
  }

  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title="Tableau de bord"
          subtitle="Vue d'ensemble de vos événements et lieux"
          primaryAction={
            <Button
              startIcon={<Plus />}
              onClick={() => navigate(`${basePath}/venues`)}
            >
              Ajouter un lieu
            </Button>
          }
        />
        <Layouts.Content>
          {/* Stats Row - 3 columns only */}
          <Grid.Root gap={4}>
            <Grid.Item col={4} s={6} xs={12}>
              <StatCard
                title="Total des lieux"
                value={stats.totalVenues}
                subtitle={`${stats.approvedVenues} approuvés`}
                icon={<House width={24} height={24} fill="primary600" />}
                onClick={() => navigate(`${basePath}/venues`)}
              />
            </Grid.Item>
            <Grid.Item col={4} s={6} xs={12}>
              <StatCard
                title="En attente"
                value={stats.pendingVenues}
                subtitle="Nécessitent une validation"
                icon={<Clock width={24} height={24} fill="warning600" />}
                iconBackground="warning100"
                onClick={() => navigate(`${basePath}/venues`)}
              />
            </Grid.Item>
            <Grid.Item col={4} s={6} xs={12}>
              <StatCard
                title="Groupes d'événements"
                value={stats.totalEventGroups}
                subtitle="Films, spectacles, etc."
                icon={<Play width={24} height={24} fill="secondary600" />}
                iconBackground="secondary100"
              />
            </Grid.Item>
          </Grid.Root>

          {/* Main Content - Recent Venues */}
          <Box marginTop={6}>
            <Card padding={5}>
              <Flex
                justifyContent="space-between"
                alignItems="center"
                marginBottom={4}
              >
                <Typography variant="delta" fontWeight="bold">
                  Lieux récents
                </Typography>
                <Button
                  variant="tertiary"
                  size="S"
                  endIcon={<ArrowRight />}
                  onClick={() => navigate(`${basePath}/venues`)}
                >
                  Voir tout
                </Button>
              </Flex>

              {recentVenues.length === 0 ? (
                <Box padding={4}>
                  <EmptyStateLayout
                    icon={<House width={48} height={48} />}
                    content={
                      <Typography textColor="neutral600">
                        Aucun lieu enregistré
                      </Typography>
                    }
                    action={
                      <Button
                        variant="secondary"
                        size="S"
                        startIcon={<Plus />}
                        onClick={() => navigate(`${basePath}/venues`)}
                      >
                        Créer un lieu
                      </Button>
                    }
                  />
                </Box>
              ) : (
                <Box>
                  {recentVenues.map((venue) => (
                    <RecentVenueRow
                      key={venue.id}
                      name={venue.name}
                      type={venue.type}
                      status={venue.status || "pending"}
                    />
                  ))}
                </Box>
              )}
            </Card>
          </Box>
        </Layouts.Content>
      </Main>
    </Layouts.Root>
  )
}

export default DashboardPage
