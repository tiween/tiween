import React from "react"
import get from "lodash/get"

import { Medium } from "../../shared/models/medium"

const TvShow: React.FC<{ medium: Medium }> = ({ medium }) => {
  const channel = get(medium, ["mediumType", 0, "channel"], null)
  return <>{channel ? <>{`sur ${channel.name}`}</> : <></>}</>
}

export default TvShow
