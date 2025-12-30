import * as React from "react"
import dynamic from "next/dynamic"

const LocationIcon = dynamic(
  () => import("@heroicons/react/solid/LocationMarkerIcon")
)
interface IMediumNameProps {
  type: "TV_SHOW" | "CHANNEL" | "VENUE"
  name: string
}

const MediumName: React.FunctionComponent<IMediumNameProps> = ({
  type,
  name,
}) => {
  let icon
  switch (type) {
    case "TV_SHOW":
    case "CHANNEL":
      icon = null
      break
    case "VENUE":
    default:
      icon = <LocationIcon />
      break
  }
  return (
    <div className="medium-name-link font-semibold md:text-lg text-base flex justify-start items-start space-x-1 w-full">
      {icon ? <div className="flex-none w-5 h-5 pt-1">{icon}</div> : <></>}
      <span>{name}</span>
    </div>
  )
}

export default MediumName
