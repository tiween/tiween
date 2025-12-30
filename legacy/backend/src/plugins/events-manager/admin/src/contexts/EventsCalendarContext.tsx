import React, { createContext, useContext, useState } from "react"

interface selectedItem {
  label: string
  value: number
}

interface EventCalendarContextProviderProps {
  medium?: selectedItem | null
  eventGroup?: selectedItem | null
  children?: React.ReactNode
}

const EventCalendarContext = createContext({
  medium: null,
  eventGroup: null,
})

export const EventCalendarContextProvider = ({
  children,
  medium,
  eventGroup,
}: EventCalendarContextProviderProps) => {
  return (
    <EventCalendarContext.Provider value={{ medium, eventGroup }}>
      {children}
    </EventCalendarContext.Provider>
  )
}

export const useEventContext = () => useContext(EventCalendarContext)
