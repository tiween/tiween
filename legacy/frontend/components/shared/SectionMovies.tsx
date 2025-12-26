import * as React from 'react';
import SectionModel from '../../shared/models/section';
import SmallMovieCard from '../Movie/SmallMovieCard';
import Section from './Section';
import get from 'lodash/get';
import classNames from 'classnames';

interface ISectionMoviesProps {
  section: SectionModel;
}

const SectionMovies: React.FunctionComponent<ISectionMoviesProps> = ({ section }) => {
  const title = get(section, ['meta', 'title'], '');
  const description = get(section, ['meta', 'description'], '');
  const movies = get(section, ['movies'], []);

  if (section?.meta?.title) {
    return (
      <Section className="related-content-movies" title={title} key={section.id}>
        {description && <div className="text-base font-fira font-light">{description}</div>}
        {movies.length > 0 && (
          <div className="grid md:grid-cols-3 grid-cols-1 gap-3">
            {movies.map((item) => {
              return (
                <div
                  className={classNames({
                    'col-span-3': movies.length === 1,
                  })}
                  key={item.id}
                >
                  <div className="rounded bg-bastille p-2">
                    <SmallMovieCard movie={item.movie} showTimeTable={false} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    );
  }
};

export default SectionMovies;
