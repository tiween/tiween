import Image from './image';

export default interface CreativeWorkPerson {
  id: string;
  job: {
    name: string;
    root?: string;
    id: string;
  };
  person: {
    fullName: string;
    id: string;
    photo: Image;
  };
  character?: string;
}
