import { object, mixed, array, boolean, string, number } from 'yup';
import { SHOWTIME_TYPES } from '../admin/src/constants';

const ShowtimeFormSchema = object().shape({
  type: mixed().oneOf([SHOWTIME_TYPES.MOVIE, SHOWTIME_TYPES.SHORT_MOVIE, SHOWTIME_TYPES.PLAY]).required(),
  tmdbid: number().when('type', (type, schema) => {
    console.log('schema', schema);
    return type === SHOWTIME_TYPES.MOVIE ? schema.required() : schema.optional()
  }),
  creative_work: number().when('type', (type, schema)=>{
    return  [SHOWTIME_TYPES.SHORT_MOVIE, SHOWTIME_TYPES.PLAY ].includes(type) ? schema.required() : schema.optional()
  })
})
const EventFormSchema = object().shape({
  medium: number().required(),
  event_group: number(),
  recurring: boolean(),
  recurringRule: string(),
  showtimes: array().of(ShowtimeFormSchema).min(1),
})

export { EventFormSchema }
