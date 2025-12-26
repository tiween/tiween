import { Person } from './person';

export interface CastPerson extends Person {
  cast_id: number;
  character: string;
  credit_id: string;
  order: number;
}
