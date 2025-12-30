/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Listbox } from "@headlessui/react"
import CheckIcon from "@heroicons/react/solid/CheckIcon"
import ChevronDownIcon from "@heroicons/react/solid/ChevronDownIcon"
import ChevronUpIcon from "@heroicons/react/solid/ChevronUpIcon"
import classNames from "classnames"
import { connectRefinementList } from "react-instantsearch-dom"

const SelectList = ({ items, currentRefinement, refine, label }) => {
  return (
    <Listbox
      as="div"
      className="relative"
      value={currentRefinement || ""}
      onChange={refine}
    >
      {({ open }) => (
        <>
          <Listbox.Button
            className={classNames(
              "flex space-x-3 justify-around items-center py-3 px-2",
              {
                "bg-gradient-to-r from-amaranth via-wild-strawberry to-gold  text-black font-bold":
                  open,
              }
            )}
          >
            {label}
            {open ? (
              <ChevronUpIcon className="w-5 h-5" />
            ) : (
              <ChevronDownIcon className="w-5 h-5" />
            )}
          </Listbox.Button>
          <Listbox.Options className="absolute p-px bg-gradient-to-r from-amaranth via-wild-strawberry to-gold z-50 flex flex-col space-y-2">
            <div className="pl-2 py-4 pr-8 bg-bastille">
              {items.map((item) => (
                <Listbox.Option
                  className={() => {
                    return classNames(
                      "capitalize text-sm font-lato font-normal flex space-x-2"
                    )
                  }}
                  key={item.label}
                  value={item.value}
                >
                  <div
                    className={classNames({
                      "text-wild-strawberry block": item.isRefined,
                      invisible: !item.isRefined,
                    })}
                  >
                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div
                    className={classNames(
                      item.isRefined ? "font-semibold" : "font-normal",
                      "truncate flex space-x-2 justify-between items-center"
                    )}
                  >
                    <div>{item.label}</div>
                    <div className="rounded-full bg-wild-strawberry inline-flex items-center justify-center px-2 py-1 leading-none font-lato text-xs font-bold">
                      {item.count}
                    </div>
                  </div>
                </Listbox.Option>
              ))}
            </div>
          </Listbox.Options>
        </>
      )}
    </Listbox>
  )
}

export default connectRefinementList(SelectList)
