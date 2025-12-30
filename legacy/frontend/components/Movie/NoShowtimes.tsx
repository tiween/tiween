import * as React from "react"
import EmojiSadIcon from "@heroicons/react/outline/EmojiSadIcon"

interface NoShowtimesProps {
  message: string
  children?: React.ReactNode
}

const NoShowtimes: React.FC<NoShowtimesProps> = ({ message, children }) => {
  return (
    <div className="bg-bastille py-12 px-4 flex flex-col justify-center items-center border-2 border-dashed rounded border-mulled-wine space-y-5">
      <EmojiSadIcon className="w-20 h-20 text-mulled-wine" />
      <p className="text-base text-selago font-bold text-center">{message}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

export default NoShowtimes
