import CreativeWork from './creative-work';
import Event from './event';
import { Medium } from './medium';
import { MovieMeta } from './moviemeta';

export interface Show {
  id: string;
  language: string;
  date: string;
  video_format: string;
  premiere: boolean;
  medium?: Medium;
  tmdbid?: number | string;
  creative_work?: CreativeWork;
  moviemeta?: { data: MovieMeta };
  event?: Event;
  //dirty hack to remove
  fullStartDate?: string;
}
