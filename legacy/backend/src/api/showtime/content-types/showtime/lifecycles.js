"use strict"

const { isEmpty, omit, get } = require("lodash")
const { rrulestr, RRuleSet } = require("rrule")
const { DateTime } = require("luxon")

module.exports = {
  async beforeCreate(event) {
    const tmdbid = get(event, ["params", "data", "tmdbid"])
    if (tmdbid) {
      const moviemeta = await strapi
        .service("api::moviemeta.moviemeta")
        .findOrFetchAndSave(tmdbid)

      event.params.data.day = DateTime.fromISO(event.params.data.date).toFormat(
        "yyyy-MM-dd"
      )
      event.params.data.moviemeta = moviemeta.id
      event.params.data.runtime = get(event.params, ["moviemeta", "runtime"], 0)
    } else if (event.params.data.creative_work) {
      event.params.data.runtime = get(
        event,
        ["params", "data", "creative_work", "runtime"],
        0
      )
    }
  },

  async afterCreate(showtime) {
    //delete cache
    // const cacheConf = strapi.middleware.cache.getCacheConfig('medium');

    const event = showtime.event
    if (get(event, ["medium", "id"], null)) {
      // await strapi.middleware.cache.clearCache(cacheConf, event.medium.id);
    }
    //generate repeating entities
    if (showtime.recurring && !isEmpty(showtime.recurringRule)) {
      const rruleSet = new RRuleSet()
      const rrule = rrulestr(showtime.recurringRule, {
        dtstart: showtime.date,
        tzid: "Africa/Tunis",
      })
      rruleSet.rrule(rrule)
      rruleSet.exdate(new Date(showtime.date))
      const occurences = rruleSet.all()
      if (occurences.length > 0) {
        const promises = occurences.map((date) => {
          const showtimeOccurence = {
            ...omit(showtime, ["_id", "id", "recurring", "reccuringRule"]),
            occurenceOf: showtime.id,
            date: new Date(date).toISOString(),
          }
          return strapi
            .service("api::showtime.showtime")
            .create(showtimeOccurence)
        })
        await Promise.all(promises)
      }
    }
  },
  async afterDelete(showtime) {
    //const cacheConf = strapi.middleware.cache.getCacheConfig('medium');
    if (get(showtime, ["medium", "id"], null)) {
      //strapi.middleware.cache.clearCache(cacheConf, showtime.medium.id);
    }
  },
}
