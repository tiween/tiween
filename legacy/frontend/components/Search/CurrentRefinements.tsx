/* eslint-disable @typescript-eslint/explicit-function-return-type */
import XIcon from "@heroicons/react/solid/XIcon"
import { connectCurrentRefinements } from "react-instantsearch-dom"

import filterNames from "../../shared/constants/filters"

const CurrentRefinements = ({ items, refine, createURL }) => {
  return (
    <ul className="flex mb-8 space-x-4">
      {items.map((item) => (
        <li key={item.label} className="flex justify-start items-center">
          <div className="mr-2">{filterNames[item.id]}</div>
          <div className="flex space-x-1">
            {item.items &&
              item.items.map((nested) => (
                <span
                  key={nested.label}
                  className="inline-flex items-center py-0.5 pl-2 pr-0.5 rounded-full text-xs font-medium bg-wild-strawberry text-black capitalize"
                >
                  <a href={createURL(nested.value)}>{nested.label}</a>
                  <button
                    type="button"
                    className="flex-shrink-0 ml-0.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-black  hover:bg-wild-strawberry-lightest hover:text-gray-600 focus:outline-none focus:bg-wild-strawberry-dark focus:text-white"
                    onClick={(event) => {
                      event.preventDefault()
                      refine(nested.value)
                    }}
                  >
                    <span className="sr-only">remove {nested.label}</span>
                    <XIcon className="w-2 h-2" />
                  </button>
                </span>
              ))}
          </div>
        </li>
      ))}
    </ul>
  )
}

export default connectCurrentRefinements(CurrentRefinements)
