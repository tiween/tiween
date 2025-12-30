"use strict"

/**
 * showtime service.
 */

const { isEmpty, omit, get } = require("lodash")
const { rrulestr, RRuleSet } = require("rrule")
const moment = require("moment")
const { createCoreService } = require("@strapi/strapi").factories

module.exports = createCoreService("api::showtime.showtime", ({ strapi }) => {
  return {
    async create(data) {
      const validData = await strapi.entityValidator.validateEntityCreation(
        strapi.getModel("api::showtime.showtime"),
        data
      )
      const { tmdbid, date } = validData.data

      const moviemeta = await strapi
        .service("api::moviemeta.moviemeta")
        .findOrFetchAndSave(validData.data.tmdbid)
      const showtimeToInsert = {
        populate: ["moviemeta"],
        data: {
          ...validData.data,
          day: moment(validData.data.date).format("YYYY-MM-DD"),
          moviemeta: moviemeta.id,
        },
      }
      const entry = await strapi
        .query("api::showtime.showtime")
        .create(showtimeToInsert)
      console.log("-----------------------------------", entry)
      return entry
    },
    async movie(params) {
      const { tmdbid } = params
      const populatePaths = [
        {
          path: "event",
          populate: {
            path: "medium",
          },
        },
      ]
      const showtimes = await strapi.db
        .query("api::showtime.showtime")
        .findMany({
          where: {
            date_gt: moment().toISOString(),
            tmdbid: tmdbid,
          },
        })
      const groupedShowtimes = reduce(
        showtimes,
        (result, value) => {
          const day = value.day
          const medium = get(value, ["event", "medium"], null)
          if (medium) {
            if (get(result, [day, medium.id], null)) {
              result[day][medium.id]["shows"].push(value)
            } else {
              set(result, [day, medium.id], { medium, shows: [value] })
            }
          }
          return result
        },
        {}
      )
      return groupedShowtimes
    },
    async play(params) {
      const { playId } = params
      const populatePaths = [
        {
          path: "event",
          populate: {
            path: "medium",
          },
        },
      ]

      ///
      const showtimes = await strapi.db
        .query("api::showtime.showtime")
        .findMany({
          where: { date_gt: moment().toISOString(), creative_work: playId },
        })
      const groupedShowtimes = reduce(
        showtimes,
        (result, value) => {
          const day = value.day
          const medium = get(value, ["event", "medium"], null)
          if (medium) {
            if (get(result, [day, medium.id], null)) {
              result[day][medium.id]["shows"].push(value)
            } else {
              set(result, [day, medium.id], { medium, shows: [value] })
            }
          }
          return result
        },
        {}
      )

      return groupedShowtimes
    },
  }
})
