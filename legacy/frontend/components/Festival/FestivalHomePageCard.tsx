import React from "react"
import Image from "next/image"
import Link from "next/link"

import { Festival } from "../../shared/models/festival"
import { festivalThumbnail } from "../../shared/services/cdn"
import DateSpan from "./DateSpan"

const FestivalHomePageCard: React.FC<{ festival: Festival }> = ({
  festival,
}) => {
  const {
    mainImage: { hash },
    id,
    startDate,
    endDate,
    slug,
    title,
    subtitle,
    homePageDisplay,
  } = festival

  if (homePageDisplay === "two_columns") {
    return (
      <Link href={`/festival/${id}/${slug}`} passHref>
        <a>
          <div className="flex justify-start">
            <div className="w-1/3">
              <Image
                src={festivalThumbnail(hash)}
                width={110}
                height={165}
                alt={title}
                layout="responsive"
              />
            </div>
            <div className="w-2/3">
              <DateSpan start={startDate} end={endDate} />
              <div>
                <h3 className="block font-black font-fira text-3xl text-selago">
                  {title}
                  {subtitle ? (
                    <span className="font-light text-base italic">
                      {subtitle}
                    </span>
                  ) : (
                    <></>
                  )}
                </h3>
              </div>
            </div>
          </div>
        </a>
      </Link>
    )
  } else {
    return <>HERO festival</>
  }
}

export default FestivalHomePageCard
