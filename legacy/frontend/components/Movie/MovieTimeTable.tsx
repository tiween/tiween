/* eslint-disable no-unused-vars */
import { DateTime } from 'luxon';
import React, { useState, useMemo } from 'react';
import DatesList from '../DatesSelector/DatesList';
import ShowtimesList from '../Showtimes/ShowtimesList';

type MovieTimetableProps = {
  timetable: unknown;
};
const sortDateTimes = (a, b): number => (a < b ? -1 : a > b ? 1 : 0);

const MovieTimetable: React.FC<MovieTimetableProps> = ({ timetable }) => {
  const dates = Object.keys(timetable);
  const sortedDatesAsObjects = useMemo(() => {
    return dates
      ?.map((date) => DateTime.fromISO(date))
      .sort(sortDateTimes)
      .map((date) => date.toFormat('yyyy-MM-dd'));
  }, [dates]);
  const [selectedDate, setSelectedDate] = useState(sortedDatesAsObjects[0]);

  return (
    <div className="mt-8">
      <DatesList
        {...{
          dates: sortedDatesAsObjects,
          selected: selectedDate,
          handleSelectDate: setSelectedDate,
        }}
      />
      <div className="mt-8 pb-10">
        <ShowtimesList timetable={timetable} selectedDate={selectedDate} />
      </div>
    </div>
  );
};

export default React.memo(MovieTimetable);
