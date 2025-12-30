import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { Transition } from "@headlessui/react"
import ArrowLeftIcon from "@heroicons/react/solid/ArrowLeftIcon"
import MenuIcon from "@heroicons/react/solid/MenuIcon"
import XIcon from "@heroicons/react/solid/XIcon"
import classNames from "classnames"

import UserMenuDesktop from "./UserMenuDesktop"
import UserMenuMobile from "./UserMenuMobile"

const commonPages = [
  {
    text: "Films à l'affiche",
    url: "/",
  },
  {
    text: "Théâtre",
    url: "#theatre",
  },
]
const MainNavigation: React.FunctionComponent = () => {
  const router = useRouter()
  const { pathname } = router
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
    <header className="main-navigation bg-cinder md:container md:max-w-6xl mb-8">
      <nav
        className={classNames("flex items-center md:px-0 px-2", {
          "px-6": pathname !== "/",
        })}
        aria-label="MainNavigation"
      >
        {pathname !== "/" ? (
          <button
            type="button"
            onClick={() => {
              router.back()
            }}
          >
            <ArrowLeftIcon className="md:hidden block flex-none w-5 h-5" />
          </button>
        ) : (
          <></>
        )}

        <div className="w-full py-5 flex items-center md:justify-between justify-center">
          <div className="flex items-center">
            <Link href="/" passHref>
              <a className="mx-auto md:mr-28 mr-0" data-testid="header-logo">
                <span className="sr-only">Tiween</span>
                <img
                  className="w-24 h-auto"
                  src="/logo-white.png"
                  alt="Tiween"
                />
              </a>
            </Link>
            <div className="left-navigation md:flex hidden justify-between text-lg font-fira font-semibold space-x-8">
              {commonPages.map((item, index) => (
                <Link
                  href={item.url}
                  passHref
                  key={`desktop-main-menu-${index}`}
                  scroll={item.url.startsWith("#")}
                >
                  <a
                    className={classNames({
                      active: pathname === item.url,
                    })}
                  >
                    {item.text}
                  </a>
                </Link>
              ))}
            </div>
          </div>

          {/* Navigation links */}
          <div className="md:block hidden">
            <UserMenuDesktop />
          </div>
        </div>

        <button
          onClick={() => setShowMobileMenu((showMobileMenu) => !showMobileMenu)}
        >
          <MenuIcon className="w-8 h-8 md:hidden" />
        </button>
      </nav>
      {/* Mobile menu */}
      <Transition
        show={showMobileMenu}
        enter="transition-opacity duration-75"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity duration-150"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="bg-cinder min-h-full absolute inset-y-0  z-20 w-11/12 px-4 py-10 md:hidden right-0">
          <nav className="flex flex-col divide-y divide-mulled-wine text-lg font-lato font-semibold  gap-y-4">
            <button
              type="button"
              className="focus:outline-none focus:ring-0 mb-6"
              onClick={() => setShowMobileMenu(false)}
            >
              <span className="sr-only">Close panel</span>
              <XIcon className="h-6 w-6" aria-hidden="true" />
            </button>

            <UserMenuMobile
              handleOpenMenu={(open) => {
                setUserMenuOpen(open)
              }}
            />
            {commonPages.map((item, index) => (
              <div
                className={classNames("pt-4 pl-8", {
                  hidden: userMenuOpen,
                })}
                key={`mobile-main-menu-${index}`}
              >
                <Link href={item.url} passHref>
                  <a>{item.text}</a>
                </Link>
              </div>
            ))}
          </nav>
        </div>
      </Transition>
    </header>
  )
}

export default React.memo(MainNavigation)
