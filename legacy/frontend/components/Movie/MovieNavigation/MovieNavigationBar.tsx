import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import ReviewIcon from "@heroicons/react/solid/AnnotationIcon"
import MovieMobileMenuOpenIcon from "@heroicons/react/solid/DotsHorizontalIcon"
import HomeIcon from "@heroicons/react/solid/HomeIcon"
import MovieMobileMenuCloseIcon from "@heroicons/react/solid/XIcon"
import classNames from "classnames"
import { signIn, useSession } from "next-auth/react"

import { useMovie } from "../../../shared/context/movie.context"
import { useReview } from "../../../shared/context/UserReviewContext"
import { slugify } from "../../../shared/services/utils"
import RatingSelector from "../../Rating/SignedInRatingSelector"
import ReviewModal from "../../Reviews/ReviewModal"
import MovieNavigationItem from "./MovieNavigationItem"

const MovieNavigationBar: React.FunctionComponent = () => {
  const [showMobileMovieMenu, setShowMobileMovieMenu] = useState(false)

  const {
    remote: { title, id },
  } = useMovie()
  const router = useRouter()
  const { status } = useSession()

  const { setShowReviewModal } = useReview()

  return (
    <>
      <div className="md:mt-8 mb-5">
        <nav className="flex z-0 divide-x divide-gray-600 bg-bastille">
          <MovieNavigationItem className="flex-none">
            <Link href={`/film/${slugify(title)}/${id}`} passHref>
              <a>
                <HomeIcon className="w-5 h-5 " />
                {router.pathname === "/film/[slug]/[tmdbid]" && (
                  <span
                    aria-hidden="true"
                    className={classNames(
                      "bg-wild-strawberry-dark absolute inset-x-0 bottom-0 h-1"
                    )}
                  />
                )}
              </a>
            </Link>
          </MovieNavigationItem>

          <MovieNavigationItem>
            <Link href={`/film/${slugify(title)}/${id}/la-critiq`} passHref>
              <a>
                <span>La Critiq&apos;</span>
                {router.pathname === "/film/[slug]/[tmdbid]/la-critiq" && (
                  <span
                    aria-hidden="true"
                    className={classNames(
                      "bg-wild-strawberry-dark absolute inset-x-0 bottom-0 h-1"
                    )}
                  />
                )}
              </a>
            </Link>
          </MovieNavigationItem>
          <MovieNavigationItem>
            <Link
              href={`/film/${slugify(title)}/${id}/avis-spectateurs`}
              passHref
            >
              <a>
                <span>Avis des Spectateurs</span>
                {router.pathname ===
                  "/film/[slug]/[tmdbid]/avis-spectateurs" && (
                  <span
                    aria-hidden="true"
                    className={classNames(
                      "bg-wild-strawberry-dark absolute inset-x-0 bottom-0 h-1"
                    )}
                  />
                )}
              </a>
            </Link>
          </MovieNavigationItem>

          <MovieNavigationItem
            className={classNames("flex-none md:hidden block ml-auto", {
              "bg-bastille-light": showMobileMovieMenu,
            })}
          >
            <button
              onClick={() => {
                setShowMobileMovieMenu(!showMobileMovieMenu)
              }}
            >
              {!showMobileMovieMenu ? (
                <MovieMobileMenuOpenIcon className="w-5 h-5 " />
              ) : (
                <MovieMobileMenuCloseIcon className="w-5 h-5 " />
              )}
            </button>
          </MovieNavigationItem>

          <MovieNavigationItem className="flex-none hidden md:block ml-auto">
            <RatingSelector readOnly />
          </MovieNavigationItem>
          <MovieNavigationItem
            className={classNames(
              "flex-none hidden md:block  hover:bg-bastille-400 cursor-pointer !px-0 !py-0",
              {
                "bg-bastille-500": showMobileMovieMenu,
              }
            )}
          >
            <button
              type="button"
              className="flex items-center space-x-1 font-semibold justify-center focus:outline-none focus:ring-non w-full h-full"
              onClick={(e) => {
                e.preventDefault()
                if (status === "unauthenticated") {
                  signIn()
                } else if (status === "authenticated" && setShowReviewModal) {
                  setShowReviewModal(true)
                }
              }}
            >
              <ReviewIcon className="w-5 h-5" />
              <span>
                Votre avis sur <i>{title}</i>
              </span>
            </button>
          </MovieNavigationItem>
        </nav>
        <div className="block md:hidden">
          {showMobileMovieMenu ? (
            <div className="grid grid-cols-2 text-center bg-bastille-light">
              <MovieNavigationItem>
                <button className="px-2 py-2 rounded-sm uppercase bg-whatsapp-green text-xs font-semibold">
                  Partager sur whatsapp
                </button>
              </MovieNavigationItem>
              <MovieNavigationItem>
                <button className="px-2 py-2 rounded-sm uppercase bg-facebook-blue text-xs font-semibold">
                  Partager sur Facebook
                </button>
              </MovieNavigationItem>
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>
      <ReviewModal
        handleClose={() => {
          setShowReviewModal(false)
        }}
      />
    </>
  )
}

export default MovieNavigationBar
