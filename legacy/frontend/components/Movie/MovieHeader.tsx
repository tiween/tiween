/* eslint-disable @typescript-eslint/no-empty-function */
import React from "react"

import { useMovie } from "../../shared/context/movie.context"
import { useReview } from "../../shared/context/UserReviewContext"
import ReviewModal from "../Reviews/ReviewModal"
import DesktopMovieHeader from "./DesktopMovieHeader"
import MobileMovieHeader from "./MobileMovieHeader"

const MovieHeader: React.FC = () => {
  const { review, showReviewModal, setShowReviewModal } = useReview()

  const {
    remote: { backdrop_path },
  } = useMovie()
  const backgroundImageStyles = {
    backgroundImage: `linear-gradient(0deg, rgba(12,9,17,1) 0%, rgba(136,134,138,0.4) 60%, rgba(255,255,255,0) 100%),url(${process.env.NEXT_PUBLIC_CDN_BASE_URL}/${process.env.NEXT_PUBLIC_TMBD_IMAGE_BASE_URL}w1280${backdrop_path}`,
  }
  return (
    <>
      <div
        className="movie-desktop-header md:block hidden   bg-no-repeat bg-right-top bg-cover"
        style={backgroundImageStyles}
      >
        <div className="container max-w-6xl md:max md:block hidden">
          <DesktopMovieHeader />
        </div>
      </div>

      <div className="movie-mobile-header md:hidden block">
        <MobileMovieHeader />
      </div>
      <ReviewModal
        review={review}
        show={showReviewModal}
        handleClose={() => {
          setShowReviewModal(false)
        }}
      />
    </>
  )
}
export default MovieHeader
