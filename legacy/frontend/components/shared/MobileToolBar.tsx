import React from "react"
import Link from "next/link"
import HomeIcon from "@heroicons/react/solid/HomeIcon"
// import ShareIcon from '@heroicons/react/solid/ShareIcon';
// import HeartIcon from '@heroicons/react/solid/HeartIcon';
import SearchIcon from "@heroicons/react/solid/SearchIcon"

const MobileToolBar: React.FunctionComponent<{
  handleAction?: (action) => void
}> = ({ handleAction }) => {
  return (
    <div className="w-full h-auto md:hidden block">
      <section
        id="mobile-toolbar"
        className="block fixed bg-gray-600 inset-x-0 bottom-0 px-6 py-3"
      >
        <div className="flex space-x-10 justify-around items-center text-selago">
          <Link href="/" passHref>
            <a className="flex flex-col items-center">
              <HomeIcon className="w-5 h-5" />
              <span className="font-lato text-xs">Accueil</span>
            </a>
          </Link>
          <button
            onClick={() => {
              handleAction({ type: "search" })
            }}
            className="flex flex-col items-center"
          >
            <SearchIcon className="w-5 h-5" />
            <span className="font-lato text-xs">Recherche</span>
          </button>
          {/* <a href="/" className="flex flex-col items-center">
            <HeartIcon className="w-5 h-5" />
            <span className="font-lato text-xs">Favoris</span>
          </a> */}
          {/* <a href="/" className="flex flex-col items-center">
            <ShareIcon className="w-5 h-5" />
            <span className="font-lato text-xs">Partager</span>
          </a> */}
        </div>
      </section>
    </div>
  )
}

export default React.memo(MobileToolBar)
