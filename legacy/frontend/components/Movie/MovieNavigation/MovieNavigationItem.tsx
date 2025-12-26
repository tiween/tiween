import classNames from 'classnames';
import * as React from 'react';

interface IMovieNavigationItemProps {
  className?: string;
  children;
}

const MovieNavigationItem: React.FunctionComponent<IMovieNavigationItemProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={classNames(
        'relative min-w-0 flex overflow-hidden items-center font-semibold py-4 px-4 text-sm  text-center  focus:z-10',
        [className],
      )}
    >
      {children}
    </div>
  );
};

export default MovieNavigationItem;
