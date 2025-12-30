import React from "react"
import classNames from "classnames"

import isArabic from "../../modules/isArabic"

type TwoLanguagesTitleProps = {
  title: string
  originalTitle?: string
  shadow?: boolean
}
const TwoLanguagesTitle: React.FC<TwoLanguagesTitleProps> = ({
  title = "",
  originalTitle = "",
  shadow = true,
}) => {
  return (
    <div className={classNames({ "text-shadow-base": shadow })}>
      {originalTitle !== title && isArabic(originalTitle) ? (
        <>
          {title}
          <br />
          <span className="font-noto font-medium">{originalTitle}</span>
        </>
      ) : (
        title
      )}
    </div>
  )
}

export default TwoLanguagesTitle
