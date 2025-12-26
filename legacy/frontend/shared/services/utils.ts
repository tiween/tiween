import isEmpty from 'lodash/isEmpty';
import { DateTime } from 'luxon';
import baseSlugify from 'slugify';
import CreativeWork from '../models/creative-work';
import CreativeWorkPerson from '../models/creative-work-person';
import { Show } from '../models/show';
export const runtimeToHuman = (runtime: number): string => {
  const hours = Math.trunc(runtime / 60);
  const minutes = runtime % 60;
  const formattedMinutes = minutes < 9 ? `0${minutes}` : minutes.toString();

  return hours > 0 ? `${hours}h${formattedMinutes} min` : `${formattedMinutes} min`;
};

export const slugify = (string?: string): string => {
  return baseSlugify(string || '', {
    replacement: '-',
    remove: /[*+~.()'"!:@?]/g,
    lower: true,
    strict: false,
    locale: 'fr',
  });
};

export const getCalendarFormat = (now, dateTime) => {
  const diff = dateTime.diff(now.startOf('day'), 'days').as('days');
  return diff < -6
    ? 'sameElse'
    : diff < -1
    ? 'lastWeek'
    : diff < 0
    ? 'lastDay'
    : diff < 1
    ? 'sameDay'
    : diff < 2
    ? 'nextDay'
    : diff < 7
    ? 'nextWeek'
    : 'sameElse';
};

export const calendar = (date): string => {
  const now = DateTime.local();
  const daysHash = {
    sameDay: "'Aujourd’hui'",
    nextDay: "'Demain'",
    nextWeek: 'EEE',
    lastDay: "'Hier'",
    lastWeek: "'Last' EEE",
    sameElse: 'EEE',
  };

  const format = getCalendarFormat(now, date) || 'sameElse';

  return date.toFormat(daysHash[format], { locale: 'fr' });
};

export const getCreativeWorkPersonsByJob = (
  creativeWork: CreativeWork,
  job: string,
): CreativeWorkPerson[] => {
  const { crew } = creativeWork;
  return crew.filter((item) => {
    return item?.job?.name === job;
  });
};

export const getShowTimeBlockType = (show: Show): string => {
  let type: string;
  if (!isEmpty(show?.creative_work)) {
    type = show?.creative_work.type;
  } else if (show?.moviemeta) {
    type = 'MOVIE';
  }
  return type;
};

export const getApiUrl = (url: string): string => {
  let fullUrl = url;
  if (url.startsWith('/')) {
    fullUrl = `${process.env.NEXT_PUBLIC_BASE_URL}${url}`;
  }
  return fullUrl;
};

export const getBackendApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';
};
