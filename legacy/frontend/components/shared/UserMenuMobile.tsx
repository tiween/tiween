import React, { Fragment } from "react"
import { useRouter } from "next/router"
import { Disclosure } from "@headlessui/react"
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon"
import UserCircleIcon from "@heroicons/react/solid/UserCircleIcon"
import classNames from "classnames"
import { signIn, signOut, useSession } from "next-auth/react"

import userNavigationItems from "../../shared/constants/usermenu"
import Spinner from "./Spinner"

const UserMenuMobile: React.FunctionComponent<{
  handleOpenMenu: (open: boolean) => void
}> = ({ handleOpenMenu }) => {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return <Spinner />
  } else if (status === "authenticated") {
    return (
      <Disclosure as={Fragment}>
        {({ open }) => (
          <>
            <Disclosure.Button
              className="py-2"
              onClick={() => {
                handleOpenMenu(open)
              }}
            >
              <div className="flex justify-between items-center font-lato font-semibold text-base text-white space-x-3 px-3 py-1">
                {session?.user?.image && (
                  <img
                    className="rounded-full w-10 h-10"
                    alt={session?.user?.name}
                    src={session?.user?.image}
                  />
                )}
                <div className="text-center">{session?.user?.name}</div>
                <div className="w-6 h-6">
                  <ChevronRightIcon
                    className={`${open ? "transform rotate-90" : ""}`}
                  />
                </div>
              </div>
            </Disclosure.Button>
            <Disclosure.Panel className="text-gray-500 font-normal space-y-3">
              {({ close }) => (
                <div className="flex flex-col items-center space-y-3">
                  <div>
                    {userNavigationItems.map(
                      ({ id, title, url, icon, disabled }) => {
                        return (
                          <div key={`mobile-user-menu-${id}`}>
                            <button
                              onClick={(e) => {
                                if (disabled) {
                                  return false
                                }
                                e.preventDefault()

                                router.push(url)
                                close()
                              }}
                              className={classNames(
                                "flex justify-start items-center px-3  py-2 rounded hover:bg-mulled-wine"
                              )}
                            >
                              {icon}
                              {title}
                            </button>
                          </div>
                        )
                      }
                    )}
                  </div>

                  <button
                    className="px-4 py-2 bg-bastille-lightest text-selago font-bold text-xs rounded uppercase"
                    onClick={() => {
                      signOut()
                    }}
                  >
                    se déconnecter
                  </button>
                </div>
              )}
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    )
  } else {
    return (
      <button
        className="flex justify-start items-center px-3 py-2 text-center bg-wild-strawberry text-sm rounded  text-white font-bold"
        onClick={() => signIn()}
      >
        <UserCircleIcon className="w-5 h-5 mr-2" />
        Mon Compte
      </button>
    )
  }
}

export default UserMenuMobile
