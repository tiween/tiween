import React from "react"
import { Transition } from "@headlessui/react"
import CloseIcon from "@heroicons/react/solid/XIcon"
import ReactPlayer from "react-player"

import { Video } from "../../shared/models/video"

const buildVideoUrl = (video): string => {
  let url
  switch (video.site) {
    case "YouTube":
      url = `https://www.youtube.com/watch?v=${video.key}`
      break
    default:
      break
  }

  return url
}

interface TrailersModalProps {
  show: boolean
  videos: Video[]
  title: string
  handleClose: (show: boolean) => void
}

const TrailersModal: React.FC<TrailersModalProps> = ({
  show,
  videos,
  title,
  handleClose,
}) => {
  return (
    <Transition
      show={show}
      enter="transition-opacity duration-75"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity duration-75"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="modal fixed w-full h-full top-0 left-0 flex items-center justify-center">
        <div className="modal-overlay absolute w-full h-full bg-black opacity-50"></div>
        <div className="modal-container md:w1/2 w-11/12 mx-auto z-50 overflow-y-auto bg-black rounded md:max-w-lg lg:max-w-2xl xl:max-w-3xl h-auto">
          <div className="flex justify-between text-selago px-3 py-3 font-lato font-bold">
            <div className="">{title}</div>
            <div className="">
              <CloseIcon
                className="cursor-pointer h-5 w-5"
                onClick={() => {
                  handleClose(false)
                }}
              />
            </div>
          </div>

          <div className="modal-content pt-4">
            {videos && videos.length > 0 && (
              <ReactPlayer
                className="main-movie-trailer aspect-w-16 aspect-h-9"
                width="100%"
                height="100%"
                url={buildVideoUrl(videos[0])}
              />
            )}
          </div>
        </div>
      </div>
    </Transition>
  )
}

export default React.memo(TrailersModal)
