import { NextApiRequest, NextApiResponse } from "next"
import { withSentry } from "@sentry/nextjs"
import { gql, GraphQLClient } from "graphql-request"
import get from "lodash/get"
import uniqBy from "lodash/uniqBy"
import { DateTime } from "luxon"

const client = new GraphQLClient(process.env.GRAPHQL_ENDPOINT)
const sortDateTimes = (a, b): number => (a < b ? -1 : a > b ? 1 : 0)

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  res.setHeader("Cache-Control", "s-maxage=7200")
  const { query } = req

  const eventGroupsQuery = gql`
    query getEventGroup($id: ID!, $date: String!) {
      eventGroup(id: $id) {
        events(where: { fullStartDate_gte: $date }) {
          startDate
          fullStartDate
        }
      }
    }
  `
  const variables = {
    id: query["event-group"],
    date: DateTime.now().toISO(),
  }

  const data = await client.request(eventGroupsQuery, variables)
  if (data) {
    const events = get(data, ["eventGroup", "events"], [])

    const uniqEvents = uniqBy(events, (item) => {
      return DateTime.fromISO(item["fullStartDate"], { locale: "fr" }).toFormat(
        "o"
      )
    })
      .map((item) => item["startDate"])
      .sort(sortDateTimes)

    return res.status(200).json(uniqEvents)
  }
}
export default withSentry(handler)
