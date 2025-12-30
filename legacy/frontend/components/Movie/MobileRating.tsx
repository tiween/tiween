import * as React from "react"
import StarIcon from "@heroicons/react/solid/StarIcon"

interface IMobileRatingProps {
  vote: number
  movieId: string | number
}

const MobileRating: React.FunctionComponent<IMobileRatingProps> = ({
  vote,
}) => {
  return (
    <div className="flex items-center space-x-1">
      <div className="text-gold w-5 h-5">
        <StarIcon />
      </div>

      <span className="text-sm font-semibold">
        {vote}
        <i className="font-normal text-sm"> /10</i>
      </span>
    </div>
  )
}

export default React.memo(MobileRating)
