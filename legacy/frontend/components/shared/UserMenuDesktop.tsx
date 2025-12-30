import React, { Fragment } from "react"
import Link from "next/link"
import { Menu, Transition } from "@headlessui/react"
import LogoutIcon from "@heroicons/react/outline/LogoutIcon"
import ChevronDownIcon from "@heroicons/react/solid/ChevronDownIcon"
import UserCircleIcon from "@heroicons/react/solid/UserCircleIcon"
import classNames from "classnames"
import { signIn, signOut, useSession } from "next-auth/react"

import userNavigationItems from "../../shared/constants/usermenu"
import Button from "./Button"
import Spinner from "./Spinner"

const UserMenu: React.FunctionComponent = () => {
  const { data: session, status } = useSession()

  if (status === "loading") {
    // TODO better loading
    return (
      <div>
        <Spinner />
      </div>
    )
  } else if (status === "authenticated") {
    return (
      <Menu as="div" className="relative inline-block">
        <Menu.Button>
          <div className="flex justify-between items-center font-lato font-bold text-white space-x-3  px-4 py-1">
            {session?.user?.image ? (
              <>
                <img
                  className="rounded-full w-10 h-10"
                  alt={session?.user?.name}
                  src={session?.user?.image}
                />
                <div className="text-center">{session?.user?.name}</div>
              </>
            ) : (
              <div className="rounded-full w-10 h-10  inline-flex items-center justify-center bg-wild-strawberry-dark ">
                <span className="font-lato font-semibold leading-none text-selago uppercase ">
                  {session.user.name.substring(0, 1)}
                </span>
              </div>
            )}

            <div className="w-5 h-5">
              <ChevronDownIcon />
            </div>
          </div>
        </Menu.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <div className="absolute right-0 origin-top-right mt-2 z-50 w-60">
            <Menu.Items className="flex flex-col bg-bastille rounded py-3 px-2 text-sm ">
              {userNavigationItems.map(({ id, title, url, icon, disabled }) => {
                return (
                  <Menu.Item key={id} disabled={disabled}>
                    {({ active }) => (
                      <Link href={url} passHref>
                        <a
                          className={classNames(
                            "flex justify-start items-center px-3 py-2 rounded hover:bg-mulled-wine",
                            {
                              "bg-mulled-wine": active,
                            }
                          )}
                        >
                          {icon}
                          {title}
                        </a>
                      </Link>
                    )}
                  </Menu.Item>
                )
              })}
              <Menu.Item as="div" className="mt-5">
                <Button
                  data-test="authentication-signout"
                  onClick={() => signOut({ callbackUrl: `/` })}
                  full
                >
                  <LogoutIcon className="w-5 h-5 mr-2" />
                  Se déconnecter
                </Button>
              </Menu.Item>
            </Menu.Items>
          </div>
        </Transition>
      </Menu>
    )
  } else {
    return (
      <button
        data-test="authentication-signin"
        className="flex justify-between items-center px-3 py-2 text-center bg-wild-strawberry text-sm rounded  text-white font-bold"
        onClick={() => signIn()}
      >
        <UserCircleIcon className="w-5 h-5 mr-2" />
        Mon Compte
      </button>
    )
  }
}

export default UserMenu
