import * as React from "react"
import classNames from "classnames"

interface IToolbarItemProps {
  isActive: boolean
  children
}

const ToolbarItem: React.FunctionComponent<IToolbarItemProps> = ({
  isActive = false,
  children,
}) => {
  return (
    <div
      className={classNames({
        "bg-bastille-lighter": isActive,
        "bg-bastille-lightest": !isActive,
      })}
    >
      {children}
    </div>
  )
}

export default ToolbarItem
