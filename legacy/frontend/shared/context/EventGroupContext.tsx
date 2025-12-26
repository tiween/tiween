/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import React, { createContext, useContext, useState } from 'react';

import BaseContent from '../models/BaseContent';
import EventGroup from '../models/event-group';

const EventGroupContext = createContext(null);

interface EventGroupProviderProps {
  value: BaseContent<EventGroup>;
  children: React.ReactNode;
}
export const EventGroupProvider: React.FC<EventGroupProviderProps> = ({ value, children }) => {
  const [currentEventGroup] = useState(value);
  return (
    <EventGroupContext.Provider value={currentEventGroup}>{children}</EventGroupContext.Provider>
  );
};

export const useEventGroup = () => useContext(EventGroupContext);
