import { DateTime } from 'luxon';
import * as React from 'react';

interface IDateProps {
  date: string;
}

const Date: React.FunctionComponent<IDateProps> = ({ date }) => {
  const dt = DateTime.fromISO(date, { locale: 'fr' });
  return (
    <div className="flex flex-col  items-center font-fira space-y-0 uppercase  border-r-2 border-mulled-wine p-4">
      <div className="dayOfWeek text-sm">{dt.weekdayLong}</div>
      <div className="dayOfMonth text-7xl font-semibold">{dt.daysInMonth}</div>
      <div className="month text-sm ">{dt.monthLong}</div>
    </div>
  );
};

export default Date;
