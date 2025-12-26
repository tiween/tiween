import * as React from 'react';
import BaseTimetable from '../Timetable/BaseTimetable';

interface IPlayTimetableProps {
  timetable: unknown;
}

const PlayTimetable: React.FunctionComponent<IPlayTimetableProps> = ({ timetable }) => {
  return (
    <div className="">
      <h2 className="font-bold text-lg mt-4 mb-2">Calendrier des représentations</h2>
      <BaseTimetable timetable={timetable} />
    </div>
  );
};

export default PlayTimetable;
