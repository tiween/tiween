import * as React from "react"

import PageTitle from "../shared/PageTitle"

interface IAuthPagesContainerProps {
  title: string
  subtitle: string | React.ReactElement
  children: React.ReactNode
}

const AuthPagesContainer: React.FunctionComponent<IAuthPagesContainerProps> = ({
  children,
  title,
  subtitle,
}) => {
  return (
    <>
      <div className="container px-2 text-center ">
        <PageTitle>{title}</PageTitle>
        <span className="text-sm text-bastille-lightest">{subtitle}</span>
      </div>
      <div className="container max-w-lg  flex flex-col items-center mt-4 px-2">
        {children}
      </div>
    </>
  )
}

export default AuthPagesContainer
