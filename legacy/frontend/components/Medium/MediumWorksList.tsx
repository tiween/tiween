import SmallMovieCard from "../Movie/SmallMovieCard"
import EventBlockShortMovieCard from "../ShortMovie/EventBlockShortMovieCard"

const MediumWorksList: React.FC<{ selectedDate: string; works: unknown }> = ({
  selectedDate,
  works,
}) => {
  const currentDateWorks = works[selectedDate]

  const worksIds = currentDateWorks ? Object.keys(currentDateWorks) : []

  return (
    <div className="space-y-4">
      {worksIds?.map((workId) => {
        return (
          <div
            key={workId}
            className="bg-bastille rounded-md px-4 py-4"
            data-test="medium-schedule-item"
          >
            {workId.startsWith("movie") && (
              <SmallMovieCard
                key={workId}
                movie={currentDateWorks[workId].movie}
                shows={currentDateWorks[workId].shows}
              />
            )}
            {workId.startsWith("creativework") && (
              <div className="">
                <div className="text-xs font-mono mb-2">[court-métrage]</div>
                <EventBlockShortMovieCard
                  work={currentDateWorks[workId].creative_work}
                  shows={currentDateWorks[workId].shows}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default MediumWorksList
