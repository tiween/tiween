'use strict';

const isEmpty = require('lodash/isEmpty');
const get = require('lodash/get');
const omit = require('lodash/omit');
const { RRuleSet, rrulestr } = require('rrule');

const generateRepeatingEventsDates = (event) => {
  const rruleSet = new RRuleSet();
  const eventStartDate = new Date(event.fullStartDate);
  const rrule = rrulestr(event.recurringRule, { dtstart: eventStartDate });
  rruleSet.rrule(rrule);
  rruleSet.exdate(new Date(event.date));
  return rruleSet.all();
};

module.exports = {
  async findEvents(ctx) {
    const { query } = ctx.request;
    let entities;
    if (ctx.request.query) {
      entities = await strapi.entityService.findMany('api::event.event', {
        filters: {
          fullStartDate: { $gte: query.startDate, $lte: query.endDate },
          medium: query.medium,
        },
        populate: {
          showtimes: {
            populate: ['creative_work', 'moviemeta']
          }
        }
      });
    }
    return entities;
  },
  async mediumsAutoComplete(ctx) {
    try {
      const params = {
        ...ctx.query,
        sort: ['name']
      }
      const mediums = await strapi.entityService.findMany('api::medium.medium', params);
      return mediums.map(item => ({
          value: item.id,
          label: item.name
        }));
      return cleanedMediumResults;
    } catch (err) {
      console.error('ERROR', err)
      ctx.body = err;
    }

  },
  async eventGroupsAutoComplete(ctx) {
    try {
      const response = await strapi.service('api::event-group.event-group').find(ctx.query);
      const { results } = response;
      const cleanedEventGroups = results.map(item => ({
          value: item.id,
          label: item.title
        }));
      return cleanedEventGroups;
    } catch (err) {
      console.error('ERROR eventGroupsAutoComplete', err)
      ctx.body = err;
    }
  },
  async upcomingEvents(ctx) {
    try {
      const response = await strapi.service('api::event.event').find();
      const { results } = response;
      console.log('results', results)
    } catch (error) {
      console.log('ERROR', error)
    }
  },

  async createEvent(ctx) {

    const { medium, event_group, showtimes, startDate, recurring, recurringRule } = ctx.request.body;
    const validData = await strapi.entityValidator.validateEntityCreation(
      strapi.getModel('api::event.event'), { medium, event_group, startDate, fullStartDate: startDate, recurring, recurringRule },
    );
    // Create event
    let createdEvent = await strapi.entityService.create('api::event.event',
      {
        data: validData,
        populate: ['showtimes']
      }
    );



    let createdShowtimes = [];
    // Create showtimes
    if (showtimes.length > 0) {
      createdShowtimes = await Promise.all(showtimes.map(showtime => (
        strapi.entityService.create('api::showtime.showtime', {
          data: {
            ...showtime,
            date: createdEvent.fullStartDate,
            day: createdEvent.startDate,
            event: createdEvent.id,
          },
          populate: ['creative_work', 'moviemeta'],
        }))));


      let runtime = 0;
      const title = createdShowtimes.map(item => {
        console.log('item', item)
        if (item.moviemeta) {
          runtime += parseInt(get(item, ['moviemeta', 'remote', 'runtime'], 10));
          return `${item.moviemeta.remote.title} [${item.language}][${item.video_format}]`;

        } if (item.creative_work) {

          const type = item.creative_work.type === 'SHORT_MOVIE' ? 'CM' : 'TH';
          runtime += parseInt(get(item, ['creative_work', 'runtime'], 0), 10);
          `${item.creative_work.title} [${item.language}][${type}]`;

        }
      }).join(', ');
      // compute event color
      const firstShowtime = createdShowtimes[0];
      let colors;

      if (firstShowtime.moviemeta) {
        colors = firstShowtime.moviemeta.colors;
      } else if (firstShowtime.creative_work) {
        colors = get(firstShowtime, ['creative_work', 'poster', 'colors'], get(firstShowtime, ['creative_work', 'photos', 0, 'colors'], {}));
      }
      // Update event with runtime
      createdEvent = await strapi.entityService.update('api::event.event', createdEvent.id, {
        data: {
          runtime,
          title,
          colors,
        },
        populate: ['showtimes']
      })
      // Create recurring events
      if (createdEvent.recurring && !isEmpty(createdEvent.recurringRule)) {
        const occurences = generateRepeatingEventsDates(createdEvent);
        if (occurences.length > 0) {
          // create the repeating events
          for (let i = 0; i < occurences.length; i++) {
            const eventDate = occurences[i];
            const repeatingEvent = {
              ...omit(createdEvent, ['id', 'recurring', 'reccuringRule']),
              fullStartDate: eventDate,
              startDate: eventDate,
              occurenceOf: createdEvent.id,
              reccuringRule: null,
            };

            const createdRepeatingEvent = await strapi.entityService.create('api::event.event', {
              data: { repeatingEvent },
              populate: 'showtimes',
            });
            if (showtimes.length > 0) {

              const createdShowtimes = await Promise.all(showtimes.map(showtime => (strapi.service('api::showtime.showtime').create({
                data: {
                  ...showtime,
                  date: eventDate,
                  day: eventDate.getDay(),
                  event: createdRepeatingEvent.id,
                }
              }))));
              createEventShowtimes(createdShowtimes, createdRepeatingEvent);

              const title = [];
              let runtime = 0;
              for (const item of createdShowtimes) {
                if (item.moviemeta) {


                  title.push(`${item.moviemeta.remote.title} [${item.language}][${item.video_format}]`);
                  runtime += parseInt(get(item, ['moviemeta', 'remote', 'runtime'], 10));
                } else if (item.creative_work) {

                  const type = item.creative_work.type === 'SHORT_MOVIE' ? 'CM' : 'TH';
                  title.push(`${item.creative_work.title} [${item.language}][${type}]`);
                  runtime += parseInt(get(item, ['creative_work', 'runtime'], 0), 10);
                }
              }
              await strapi.entityService.update('api::showtime.showtime', createdRepeatingEvent.id, {
                data: {
                  title: title.join('\n'),
                  colors,
                  runtime
                },
              })
              this.createEventShowtimes(createdShowtimes, createdRepeatingEvent);
              this.createEventShowtimes(createdShowtimes, createdEvent);
            }
          }
        }
        this.createEventShowtimes(createdShowtimes, createdEvent);

      }


    }
    return createdEvent;
  },
  async createEventShowtimes(showtimes, event) {
    const title = [];
    let runtime = 0;
    let remote_info;
    let colors;
    for (const item of showtimes) {
      try {

        if (item.moviemeta) {
          title.push(`${item.moviemeta.title} [${item.language}][${item.video_format}]`);

          runtime += parseInt(get(item, ['moviemeta', 'runtime'], 10));
        } else if (item.creative_work) {

          const type = item.creative_work.type === 'SHORT_MOVIE' ? 'CM' : 'TH';
          title.push(`${item.creative_work.title} [${item.language}][${type}]`);
          runtime += parseInt(get(item, ['creative_work', 'runtime'], 0), 10);
        }
        const firstShowtime = showtimes[0];
        // let colors;
        // return;
        if (firstShowtime.moviemeta) {
          colors = firstShowtime.moviemeta.colors;
        } else if (firstShowtime.creative_work) {
          colors = get(firstShowtime, ['creative_work', 'poster', 'colors'], get(firstShowtime, ['creative_work', 'photos', 0, 'colors'], {}));
        }

      } catch (e) {
        console.log(e);
      }
    }

    const updatedEvent = await strapi.entityService.update('api::event.event', event.id, {
      data: {
        title: title.join('\n'),
        colors,
        runtime
      }
    });
    return updatedEvent;
  },


  async deleteEvent(ctx) {
    const { params: { id } } = ctx;
    if (id) {
      return await strapi.service('api::event.event').delete(parseInt(id));

    }
  }

};
