import React from 'react';
import MediumMovieTimeTable from '../Medium/MediumMovieTimeTable';

type ShowtimesListProps = {
  selectedDate?: string;
  timetable: unknown;
};
const ShowtimesList: React.FC<ShowtimesListProps> = ({ timetable, selectedDate }) => {
  return (
    <div
      className="flex flex-col space-y-5 md:px-0 px-2 md:overflow-auto overflow-y-scroll"
      data-test="showtimes-list"
    >
      {Object.keys(timetable[selectedDate]).map((key) => {
        const item = timetable[selectedDate][key];
        const medium = item.medium;
        return (
          <MediumMovieTimeTable
            key={`${medium.id}`}
            selectedDate={selectedDate}
            mediumTimeTable={item}
          />
        );
      })}
    </div>
  );
};

export default React.memo(ShowtimesList);
