import * as React from "react"

interface PageTitleProps {
  children: React.ReactNode
}
const PageTitle: React.FunctionComponent<PageTitleProps> = ({ children }) => {
  return (
    <h1 className="font-lato font-black md:text-5xl text-3xl text-white">
      {children}
    </h1>
  )
}

export default PageTitle
