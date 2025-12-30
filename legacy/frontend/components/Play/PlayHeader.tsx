import * as React from "react"
import Image from "next/image"
// import CalendarIcon from '@heroicons/react/outline/CalendarIcon';
import ClockIcon from "@heroicons/react/solid/ClockIcon"
import isEmpty from "lodash/isEmpty"

import { useCreativeWork } from "../../shared/context/CreativeWorkContext"
import { posterImageLoader } from "../../shared/services/cdn"
import { runtimeToHuman } from "../../shared/services/utils"
import TheaterIcon from "../shared/icons/Theater"
import PageTitle from "../shared/PageTitle"
import TwoLanguagesTitle from "../shared/TwoLanguagesTitle"

const PlayHeader: React.FunctionComponent = () => {
  const play = useCreativeWork()

  const { poster, title, runtime } = play

  return (
    <div className="flex justify-between w-full mb-4">
      <div className="flex flex-col  w-3/4">
        <PageTitle>
          <TwoLanguagesTitle
            title={play.title}
            originalTitle={play.originalTitle}
          />
        </PageTitle>
        <div className="flex justify-start items-center space-x-2 mb-3">
          <div className="bg-wild-strawberry-dark w-8 h-8 rounded-full pt-1">
            <TheaterIcon className="w-8 h-8 text-cinder" />
          </div>
          <span className="capitalize font-semibold text-sm">Théâtre</span>
        </div>
        <div className="flex justify-start text-bastille-100 text-sm font-lato space-x-4">
          <div className="flex justify-start space-x-1">
            <ClockIcon className="w-5 h-5" />
            <span>{runtimeToHuman(runtime)}</span>
          </div>
        </div>
      </div>
      {!isEmpty(poster) && (
        <div className="md:w-40 w-28 block flex-none">
          <div className="aspect-w-2 aspect-h-3">
            <Image
              className="rounded-sm"
              src={poster.hash}
              layout="fill"
              alt={title}
              loader={posterImageLoader}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayHeader
