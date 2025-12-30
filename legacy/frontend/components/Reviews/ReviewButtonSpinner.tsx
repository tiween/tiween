import React from "react"

const ReviewButtonSpinner: React.FunctionComponent = () => {
  return (
    <div className="flex justify-center items-center mr-4 ">
      <div
        style={{ borderTopColor: "transparent" }}
        className="animate-spin  w-4 h-4  border-2  border-selago rounded-full"
      />
    </div>
  )
}

export default ReviewButtonSpinner
