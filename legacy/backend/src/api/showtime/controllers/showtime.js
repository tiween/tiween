import { factories } from "@strapi/strapi"
import get from "lodash/get"
import pick from "lodash/pick"
import reduce from "lodash/reduce"
import set from "lodash/set"
import uniqBy from "lodash/uniqBy"

import moviemeta from "../../moviemeta/controllers/moviemeta"

const { DateTime } = require("luxon")

const remoteMovieFields = [
  "id",
  "original_title",
  "title",
  "poster_path",
  "release_date",
  "runtime",

  "videos",
  "vote_average",
]
export default factories.createCoreController(
  "api::showtime.showtime",
  ({ strapi }) => ({
    async upcomingMovies(ctx) {
      const now = DateTime.now().toISO()
      let movies = []
      try {
        const showtimes = await strapi.entityService.findMany(
          "api::showtime.showtime",
          {
            filters: {
              event: {
                fullStartDate: {
                  $gte: now,
                },
              },
            },
            populate: {
              event: {
                fields: ["id", "colors"],
              },
              moviemeta: {
                remote: true,
              },
            },
          }
        )

        if (showtimes.length > 0) {
          movies = uniqBy(
            showtimes.filter((item) => item?.tmdbid),
            "tmdbid"
          ).map((item) => {
            const movie = {
              content_type: "MOVIE",
              ...pick(get(item, ["moviemeta", "remote"]), remoteMovieFields),
            }
            console.log("movie", movie)
            return movie
          })
        }

        return movies
      } catch (err) {
        console.log("error", err)
        ctx.body = err
      }
    },
    async movieTimetable(ctx) {
      const now = DateTime.now().toISO()
      const {
        params: { tmdbid },
      } = ctx
      if (tmdbid) {
        const showtimes = await strapi.entityService.findMany(
          "api::showtime.showtime",
          {
            filters: {
              event: {
                fullStartDate: {
                  $gte: now,
                },
              },
              tmdbid,
            },
            populate: {
              event: {
                fields: ["id", "fullStartDate"],
                populate: {
                  medium: {
                    fields: ["id", "name", "type", "slug"],
                  },
                },
              },
            },
            sort: { date: "asc" },
          }
        )

        const groupedShowtimes = showtimes.reduce((result, value) => {
          const day = value.day
          const medium = get(value, ["event", "medium"], null)
          // Set 'date' value from 'fullStartDate'
          value.date = value.event.fullStartDate

          if (medium) {
            const currentDayMedium = get(result, [day, medium.slug], null)
            if (currentDayMedium) {
              currentDayMedium.shows.push(value)
            } else {
              result[day] = {
                ...result[day],
                [medium.slug]: { medium, shows: [value] },
              }
            }
          }
          return result
        }, {})

        return groupedShowtimes
      }
    },
  })
)
