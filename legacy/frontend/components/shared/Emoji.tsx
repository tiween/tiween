import React from "react"

const Emoji: React.FunctionComponent<{
  label?: string
  symbol: string
}> = ({ label, symbol }) => (
  <span
    className="emoji"
    role="img"
    aria-label={label ? label : ""}
    aria-hidden={label ? "false" : "true"}
  >
    {symbol}
  </span>
)
export default Emoji
