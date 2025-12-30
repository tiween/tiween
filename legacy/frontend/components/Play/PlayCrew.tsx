import React from "react"
import classNames from "classnames"
import groupBy from "lodash/groupBy"

import { useCreativeWork } from "../../shared/context/CreativeWorkContext"

const PlayCrew: React.FunctionComponent = () => {
  const { crew } = useCreativeWork()

  const groupedByJobs = groupBy(crew, (crewMember) => {
    return crewMember?.job?.root || crewMember?.job?.name
  })

  const jobs = Object.keys(groupedByJobs)
  return (
    <div className="block mb-5">
      <h2 className="capitalize font-bold text-lg mb-2">Équipe artistique</h2>
      <div className="grid grid-cols-5-5 justify-start space-y-4">
        {jobs.length > 0 &&
          jobs.map((job, index) => (
            <div key={job} className="job flex flex-col justify-start">
              <div
                className={classNames(
                  "font-semibold flex flex-start space-x-3",
                  {
                    "text-lg font-bold": index === 0,
                    "text-sm font-bold": index > 0,
                  }
                )}
              >
                <span
                  className={classNames(" text-bastille-lighter w-1/2", {
                    " font-bold": index === 0,
                    "font-medium": index > 0,
                  })}
                >
                  {job}
                </span>

                <ul>
                  {groupedByJobs[job].map((item) => (
                    <li key={item.id}>{item?.person?.fullName}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

export default PlayCrew
