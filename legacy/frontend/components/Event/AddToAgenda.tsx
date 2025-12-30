import React, { Fragment } from "react"
import { Popover, Transition } from "@headlessui/react"
import CalendarIcon from "@heroicons/react/outline/CalendarIcon"
import axios from "axios"
import { signIn, useSession } from "next-auth/react"

import useRequest from "../../shared/hooks/useRequest"
import Agenda from "../../shared/models/agenda"
import Event from "../../shared/models/event"
import AgendaForm from "./AgendaForm"

const AddToAgenda: React.FunctionComponent<{ event: Event }> = ({ event }) => {
  const { status } = useSession()
  const { data: agendas, mutate } = useRequest<Agenda[]>({
    url:
      status === "authenticated"
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/user/agendas`
        : null,
  })
  if (status === "authenticated") {
    return (
      <div className="w-full max-w-sm px-4">
        <Popover className="relative">
          {() => (
            <>
              <Popover.Button
                key="online-add-to-agenda"
                className="md:px-2 md:py-1 p-1 bg-wild-strawberry rounded md:text-sm text-xs"
              >
                <CalendarIcon className="md:hidden block w-5 h-5" />
                <span className="md:block hidden">Ajouter à mon agenda</span>
              </Popover.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
              >
                <Popover.Panel className="absolute z-10 right-0 w-screen max-w-sm  mt-1 rounded-md overflow-hidden bg-mulled-wine ">
                  <div className="bg-cinder">
                    <AgendaForm
                      handleSubmit={async (values) => {
                        await axios.post(
                          `${process.env.NEXT_PUBLIC_BASE_URL}/user/agenda/create`,
                          values
                        )
                        mutate()
                      }}
                    />
                  </div>
                  {agendas && (
                    <div className="divide-y divide-gray-600 border-t border-gray-900 text-sm font-base">
                      <>
                        {agendas.map((item) => (
                          <button
                            className="group w-full h-12 px-5 py-2 flex justify-between cursor-pointer hover:bg-gray-400 hover:text-gray-800"
                            key={item.id}
                            onClick={() => {
                              axios
                                .post(
                                  `${process.env.NEXT_PUBLIC_BASE_URL}/events/add-to-agenda`,
                                  {
                                    event: event.id,
                                    agenda: item.id,
                                  }
                                )
                                .then((response) => console.log("OK", response))
                            }}
                          >
                            <div>{item.name}</div>
                            <div className="hidden group-hover:block text-2xs bg-gray-500 px-1 py-2 rounded-sm text-selago">
                              Ajouter dans cet agenda
                            </div>
                          </button>
                        ))}
                      </>
                    </div>
                  )}
                </Popover.Panel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    )
  } else if (status === "unauthenticated") {
    return (
      <button
        key="online-add-to-agenda"
        className="md:px-2 md:py-1 p-1 bg-wild-strawberry rounded md:text-sm text-xs"
        onClick={() => signIn()}
      >
        <CalendarIcon className="md:hidden block w-5 h-5" />
        <span className="md:block hidden">Ajouter à mon agenda</span>
      </button>
    )
  }
}

export default AddToAgenda
