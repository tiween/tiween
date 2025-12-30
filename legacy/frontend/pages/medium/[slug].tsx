import { useState } from "react"
/* eslint-disable @typescript-eslint/no-unused-vars */
import { GetServerSideProps } from "next"
import get from "lodash/get"
import set from "lodash/set"
import { DateTime } from "luxon"
import qs from "qs"
import ReactMarkdown from "react-markdown"

import DatesList from "../../components/DatesSelector/DatesList"
import MediumWorksList from "../../components/Medium/MediumWorksList"
import Layout from "../../components/shared/Layout"
import { Medium as MediumType } from "../../shared/models/medium"
import { request } from "../../shared/services/strapi"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MediumTypesMeta = {
  TV_SHOW: {
    title: "Programmation de l'émission: ",
    description: "Programme TV pour l'émission: ",
  },
  CHANNEL: { title: "Chaine" },
  VENUE: {
    title: "Salle",
    description:
      "Retrouvez toutes les séances et horaires disponibles pour le cinéma: ",
  },
}
export const getServerSideProps: GetServerSideProps = async (context) => {
  const {
    params: { slug },
  } = context

  const params = {
    fields: ["startDate"],
    filters: {
      fullStartDate: { $gte: DateTime.now().toISO() },
      medium: {
        slug,
      },
    },
    populate: {
      medium: {
        fields: ["id", "name", "type"],
      },
      showtimes: {
        fields: ["id", "language", "date", "premiere"],
        populate: ["moviemeta"],
      },
    },
  }

  const {
    data: { data: mediumEvents },
  } = await request("/api/events", {
    params,
    paramsSerializer: (params) => {
      return qs.stringify(params, { encodeValuesOnly: true })
    },
  })
  // get the first medium and store it
  const medium = get(mediumEvents, [0, "attributes", "medium", "data"])
  const mediumEventsGroupedByDayAndWork = {}
  mediumEvents.forEach((item) => {
    const day = item.attributes?.startDate
    const showtimes = item.attributes?.showtimes.data

    showtimes.forEach((showtime) => {
      const movie = showtime.attributes.moviemeta.data.attributes.remote
      if (movie) {
        const tmdbid = `movie_${movie.id}`
        if (get(mediumEventsGroupedByDayAndWork, [day, tmdbid], null)) {
          mediumEventsGroupedByDayAndWork[day][tmdbid].shows.push(showtime)
        } else {
          const movieAndShowtimes = {
            movie,
            shows: [showtime],
          }
          set(mediumEventsGroupedByDayAndWork, [day, tmdbid], movieAndShowtimes)
        }
      }
    })
  })
  console.log("mediumEvents", {
    mediumEventsGroupedByDayAndWork,
  })
  return {
    props: {
      medium: {
        id: medium.id,
        ...medium.attributes,
        works: mediumEventsGroupedByDayAndWork,
      },
    },
  }
}
type MediumProps = {
  medium: MediumType
}
const MediumPage: React.FunctionComponent = ({ medium }: MediumProps) => {
  const { name, description, works } = medium
  const dates = Object.keys(works)
  const [selectedDate, setSelectedDate] = useState(dates[0])
  return (
    <Layout pageName="medium-page">
      <div className="container max-w-6xl">
        <div className="mb-10">
          <h1 className="text-5xl font-fira font-bold">{name && name}</h1>
          {description && (
            <ReactMarkdown className="markdown">{description}</ReactMarkdown>
          )}
        </div>
        {dates.length > 0 && (
          <div className="flex flex-col space-y-5">
            <DatesList
              selected={selectedDate}
              dates={dates}
              handleSelectDate={setSelectedDate}
            />
            <div className="px-2">
              <MediumWorksList selectedDate={selectedDate} works={works} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default MediumPage
