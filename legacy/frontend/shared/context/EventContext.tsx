/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import React, { createContext, useContext, useState } from 'react';
import Event from '../models/event';

const EventContext = createContext(null);

export const EventProvider: React.FC<{
  value: Event;
  children: React.ReactNode;
}> = ({ value, children }) => {
  const [currentEvent] = useState(value);
  return <EventContext.Provider value={currentEvent}>{children}</EventContext.Provider>;
};

export const useEvent = () => useContext(EventContext);
