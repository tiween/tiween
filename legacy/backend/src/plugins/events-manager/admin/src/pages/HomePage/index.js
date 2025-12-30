/*
 *
 * HomePage
 *
 */

import React, { useMemo, useState } from "react"
import { Flex } from "@strapi/design-system/Flex"
import { ContentLayout, HeaderLayout } from "@strapi/design-system/Layout"
import { Link } from "@strapi/design-system/Link"
import ArrowLeft from "@strapi/icons/ArrowLeft"

import EventGroupSelector from "../../components/EventGroupSelector"
import EventsCalendar from "../../components/EventsCalendar"
import MediumSelector from "../../components/MediumSelector"
import { EventCalendarContextProvider } from "../../contexts/EventsCalendarContext"

// import { ActionLayout, ContentLayout, HeaderLayout, Layout } from '@strapi/design-system/Layout';
const HomePage = () => {
  const [selectedMedium, setSelectedMedium] = useState(null)
  const [selectedEventGroup, setSelectedEventGroup] = useState(null)
  console.log("HomePage", selectedMedium)
  const memoisedMediumSelector = useMemo(
    () => (
      <MediumSelector
        key="medium-selector"
        onSelectMedium={setSelectedMedium}
      />
    ),
    [selectedMedium]
  )
  // const memoisedMediumSelector = useMemo(() => <MediumSelector key="medium-selector" onSelectMedium={setSelectedMedium} />, [selectedMedium])
  const memoisedEventsCalendar = useMemo(
    () => (
      <EventsCalendar
        selectedMedium={selectedMedium}
        selectedEventGroup={selectedEventGroup}
      />
    ),
    [selectedMedium, selectedEventGroup]
  )
  return (
    <div>
      <EventCalendarContextProvider
        medium={selectedMedium}
        eventGroup={selectedEventGroup}
      >
        <HeaderLayout
          navigationAction={
            <Link startIcon={<ArrowLeft />} to="/">
              Go back
            </Link>
          }
          primaryAction={
            <Flex>
              {memoisedMediumSelector}
              <EventGroupSelector
                key="event-group-selector"
                onSelectEventGroup={setSelectedEventGroup}
              />
            </Flex>
          }
          title="Events Manager"
          as="h2"
        />
        <ContentLayout>{memoisedEventsCalendar}</ContentLayout>
      </EventCalendarContextProvider>
    </div>
  )
}

export default HomePage
