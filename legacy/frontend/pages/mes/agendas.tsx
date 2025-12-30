import * as React from "react"
import { Disclosure, Popover, Transition } from "@headlessui/react"
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon"
import LockClosedIcon from "@heroicons/react/solid/LockClosedIcon"
import LockOpenIcon from "@heroicons/react/solid/LockOpenIcon"
import ShareIcon from "@heroicons/react/solid/ShareIcon"
import classNames from "classnames"
import { FacebookIcon } from "react-share"
import FacebookShareButton from "react-share/lib/FacebookShareButton"

import EventBlock from "../../components/Event/EventBlock"
import Layout from "../../components/shared/Layout"
import PageTitle from "../../components/shared/PageTitle"
import useRequest from "../../shared/hooks/useRequest"
import Agenda from "../../shared/models/agenda"

const Agendas: React.FunctionComponent = () => {
  const { data: agendas } = useRequest<Agenda[]>({
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/user/agendas-with-relations`,
  })

  return (
    <Layout>
      <div className="container max-w-6xl px-2">
        <PageTitle>Mes Agendas</PageTitle>
        <div className="w-full pt-16">
          <div className="flex flex-col w-full justify-start items-start">
            {agendas &&
              agendas.length &&
              agendas.map((item) => {
                return (
                  <Disclosure
                    key={item.id}
                    as="div"
                    className="w-full mb-4 bg-gray-900"
                  >
                    {({ open }) => (
                      <>
                        <Disclosure.Button
                          className={classNames(
                            "md:text-2xl text-lg font-semibold text-left md:px-3 px-2  rounded-t-md  bg-mulled-wine py-4 w-full flex justify-between items-center",
                            {
                              "rounded-b-md": !open,
                            }
                          )}
                        >
                          <div className="flex justify-start items-center space-x-3">
                            <button
                              className="w-6 h-6"
                              onClick={(event) => {
                                event.stopPropagation()
                              }}
                            >
                              {item.public ? (
                                <LockOpenIcon />
                              ) : (
                                <LockClosedIcon />
                              )}
                            </button>
                            <div>{item.name}</div>
                          </div>
                          <div className="flex justify-between items-center space-x-3">
                            <div>
                              {item.public && (
                                <>
                                  <div className="w-full max-w-sm px-4 fixed top-16">
                                    <Popover className="relative">
                                      {({ open }) => (
                                        <>
                                          <Popover.Button
                                            className={classNames(
                                              "flex justify-between py-1 px-2 items-center space-x-2 border border-blue-600 rounded bg-blue-900 hover text-blue-200 hover:bg-blue-700 hover:border-blue-300 hover:text-blue-100",
                                              {
                                                "text-opacity-90": open,
                                              }
                                            )}
                                          >
                                            <ShareIcon className="w-4- h-4" />
                                            <span>partage</span>
                                          </Popover.Button>
                                          <Transition
                                            as={React.Fragment}
                                            enter="transition ease-out duration-200"
                                            enterFrom="opacity-0 translate-y-1"
                                            enterTo="opacity-100 translate-y-0"
                                            leave="transition ease-in duration-150"
                                            leaveFrom="opacity-100 translate-y-0"
                                            leaveTo="opacity-0 translate-y-1"
                                          >
                                            <Popover.Panel className="absolute z-10 right-0 w-screen max-w-sm  mt-1 rounded-md overflow-hidden bg-mulled-wine ">
                                              <div className="bg-cinder">
                                                <FacebookShareButton
                                                  url={`${process.env.NEXT_PUBLIC_BASE_URL}/agendas/${item.id}`}
                                                >
                                                  <FacebookIcon size={32} />
                                                </FacebookShareButton>
                                              </div>
                                            </Popover.Panel>
                                          </Transition>
                                        </>
                                      )}
                                    </Popover>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="w-5 h-5">
                            <ChevronRightIcon
                              className={`${open ? "transform rotate-90" : ""}`}
                            />
                          </div>
                        </Disclosure.Button>
                        <Disclosure.Panel as="div" className="md:p-6 px-2 py-3">
                          <div className="agenda-events-list w-full flex flex-col space-y-2">
                            {item.events.map((event) => {
                              // return <div key={`${item.id}-${event.id}`}>{event.id}</div>;
                              return (
                                <EventBlock
                                  key={`${item.id}-${event.id}`}
                                  event={event}
                                />
                              )
                            })}
                          </div>
                        </Disclosure.Panel>
                      </>
                    )}
                  </Disclosure>
                )
              })}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Agendas
