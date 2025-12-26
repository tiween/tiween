import { Person } from './person';

export interface CrewPerson extends Person {
  credit_id: string;
  department: string;
  job: string;
  known_for_department: string;
  name: string;
}
