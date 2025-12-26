import EventGroup from './event-group';
import { Medium } from './medium';
import { Show } from './show';

export default interface Event {
  startDate?: string;
  id: string;
  medium?: Medium;
  fullStartDate?: string;
  showtimes?: Show[];
  event_group?: EventGroup;
  runtime?: number;
}
