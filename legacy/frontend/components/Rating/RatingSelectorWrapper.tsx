import React from "react"
import { useSession } from "next-auth/react"

import RatingSkeleton from "./RatingSkeleton"
import ReadOnlyRatingSelector from "./ReadonlyRatingSelector"
import RatingSelector from "./SignedInRatingSelector"

interface IRatingSelectorWrapperProps {
  base: number
}

const RatingSelectorWrapper: React.FunctionComponent<
  IRatingSelectorWrapperProps
> = ({ base }) => {
  const { status } = useSession()
  if (status === "unauthenticated") {
    return <ReadOnlyRatingSelector base={base} />
  } else if (status === "loading") {
    return <RatingSkeleton />
  } else {
    return <RatingSelector base={base} />
  }
}

export default RatingSelectorWrapper
