import React from "react"
import { Transition } from "@headlessui/react"
import CloseIcon from "@heroicons/react/solid/XIcon"
import classNames from "classnames"

const Modal: React.FC<{
  show: boolean
  title?: string
  contentFullWidth?: boolean
  handleClose: (show: boolean) => void
  style?: React.CSSProperties
  children?
}> = ({
  show,
  title,
  handleClose,
  children,
  style = {},
  contentFullWidth = false,
}) => {
  return (
    <Transition
      show={show}
      enter="transition-opacity duration-75"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity duration-75"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="modal fixed w-full h-full top-0 left-0 flex items-center justify-center">
        <div className="modal-overlay absolute w-full h-full bg-black opacity-50"></div>
        <div
          className="modal-container md:w1/2 w-11/12 mx-auto z-50 overflow-y-auto bg-black rounded md:max-w-lg lg:max-w-2xl xl:max-w-3xl h-auto"
          style={style}
        >
          <div
            className={classNames(
              "flex  text-selago px-3 py-3 font-lato font-bold",
              {
                "justify-between": !!title,
                "justify-end": !title,
              }
            )}
          >
            {title && <div className="">{title}</div>}

            <div className="">
              <CloseIcon
                className="cursor-pointer h-5 w-5"
                onClick={() => {
                  handleClose(false)
                }}
              />
            </div>
          </div>

          <div
            className={classNames("modal-content pt-4", {
              "px-10 pb-10": !contentFullWidth,
            })}
          >
            {children}
          </div>
        </div>
      </div>
    </Transition>
  )
}

export default Modal
