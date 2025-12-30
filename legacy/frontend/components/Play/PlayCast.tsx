import * as React from "react"
import Image from "next/image"

import { useCreativeWork } from "../../shared/context/CreativeWorkContext"
import { personPhotoImageLoader } from "../../shared/services/cdn"
import TheaterIcon from "../shared/icons/Theater"

const PlayCast: React.FunctionComponent = () => {
  const { cast } = useCreativeWork()
  return (
    <div className="block">
      <h2 className="capitalize font-bold text-lg mb-2">Interprétation</h2>
      <div className="grid grid-cols-3 md:flex md:grid-cols-none md:space-x-2">
        {cast.length > 0 &&
          cast.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-start  items-center  py-4 px-2 space-y-3"
            >
              {item?.person?.photo ? (
                <div className="w-16 h-16 ">
                  <div className="aspect-w-1 aspect-h-1">
                    <Image
                      className="rounded-full"
                      src={item?.person?.photo?.hash}
                      layout="fill"
                      loader={personPhotoImageLoader}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-gray-700 w-16 h-16  rounded-full pt-2">
                  <TheaterIcon className="w-16 h-16 text-gray-400" />
                </div>
              )}
              <div className="flex flex-col items-center">
                <span className="font-semibold text-sm text-center align-middle flex-auto">
                  {item?.person?.fullName}
                </span>
                {item?.character && (
                  <span className=" text-sm text-center  text-gray-500 ">
                    {item?.character}
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

export default PlayCast
