import * as React from "react"
import HeartIcon from "@heroicons/react/solid/HeartIcon"
import { signIn } from "next-auth/react"

interface IReadOnlyRatingSelectorProps {
  base: number
}

const ReadOnlyRatingSelector: React.FunctionComponent<
  IReadOnlyRatingSelectorProps
> = ({ base = 5 }) => {
  return (
    <button
      onClick={() => {
        signIn()
      }}
      className="readonly-rating-selector flex"
    >
      {[...Array(base)].map((_, index) => {
        return (
          <div key={`readonly-rating-${index}`}>
            <HeartIcon className="h-8 w-8 text-bastille-lighter" />
          </div>
        )
      })}
    </button>
  )
}

export default ReadOnlyRatingSelector
