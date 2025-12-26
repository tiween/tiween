import SectionMeta from './section-meta';
import SectionMovie from './section-movie';

export default interface Section {
  id: string;
  __component: 'section.movies';
  meta: SectionMeta;
  movies?: SectionMovie[];
}
