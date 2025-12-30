import { NextApiRequest, NextApiResponse } from "next"
import { withSentry } from "@sentry/nextjs"
// import { request } from '../../../../shared/services/strapi';
import { gql, GraphQLClient } from "graphql-request"
import get from "lodash/get"
import { DateTime } from "luxon"

const client = new GraphQLClient(process.env.GRAPHQL_ENDPOINT)

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  res.setHeader("Cache-Control", "s-maxage=7200")

  const { query } = req
  const eventsQuery = gql`
    query getEventsByEventGroupAndDate(
      $eventGroupId: String!
      $startDate: String!
      $endDate: String!
    ) {
      events(
        sort: "fullStartDate:asc"
        where: {
          event_group: $eventGroupId
          fullStartDate_gte: $startDate
          fullStartDate_lte: $endDate
        }
      ) {
        id
        startDate
        fullStartDate
        medium {
          name
          type
          slug
          mediumType {
            __typename
            ... on ComponentMediumVenue {
              id

              location {
                id
                street
                region {
                  name
                }
              }
            }
          }
        }
        showtimes {
          id
          creative_work {
            id
            title
            slug
            type
            runtime
            originalTitle
            releaseYear
            poster {
              id
              hash
            }
            photos {
              hash
              id
            }
            terms {
              id
              name
            }
            production_countries {
              id
              name
            }
          }
          moviemeta {
            remote
          }
        }
      }
    }
  `

  const today = DateTime.now()
  const ordinalToday = parseInt(DateTime.now().toFormat("o"), 10)
  const selectedDay = parseInt(
    DateTime.fromISO(query["date"] as string, {
      zone: "Africa/Tunis",
    }).toFormat("o"),
    10
  )

  let startDate
  if (selectedDay === ordinalToday) {
    startDate = DateTime.fromISO(query["date"] as string, {
      zone: "Africa/Tunis",
    })
      .set({
        hour: today.hour,
        minute: today.minute,
      })
      .toISO()
  } else {
    startDate = DateTime.fromISO(query["date"] as string, {
      zone: "Africa/Tunis",
    })
      .startOf("day")
      .toISO()
  }

  const endDate = DateTime.fromISO(query["date"] as string, {
    zone: "Africa/Tunis",
  })
    .endOf("day")
    .toISO()
  const variables = {
    eventGroupId: query["event-group"],
    endDate,
    startDate,
  }

  const data = await client.request(eventsQuery, variables)
  const events = get(data, ["events"], null)
  if (events) {
    res.status(200).json(events)
  }
}
export default withSentry(handler)
