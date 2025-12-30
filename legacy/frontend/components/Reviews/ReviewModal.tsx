import React, { Fragment, useEffect, useState } from "react"
import { Dialog, Transition } from "@headlessui/react"
import axios from "axios"
import { convertFromRaw, convertToRaw, EditorState } from "draft-js"
import isEmpty from "lodash/isEmpty"
import { useSWRConfig } from "swr"

import { useMovie } from "../../shared/context/movie.context"
import ReviewModel from "../../shared/models/review"
import MovieTitle from "../Movie/MovieTitle"
import RatingSelector from "../Rating/SignedInRatingSelector"
import ReviewButtonSpinner from "./ReviewButtonSpinner"
import ReviewEditor from "./ReviewEditor"

interface IReviewModalProps {
  show?: boolean
  handleClose: (show: boolean) => void
  review?: ReviewModel
}

const ReviewModal: React.FunctionComponent<IReviewModalProps> = ({
  show = false,
  handleClose,
  review,
}) => {
  const { remote: movie, ...moviemeta } = useMovie()
  const { title, original_title } = movie
  const { id } = moviemeta
  const { mutate } = useSWRConfig()
  const [isSendingReview, setIsSendingReview] = useState(false)
  const [isDeletingReview, setIsDeletingReview] = useState(false)
  useEffect(() => {
    if (!isEmpty(review)) {
      setEditorState(
        EditorState.createWithContent(
          convertFromRaw(JSON.parse(review.content))
        )
      )
    }

    return () => {
      console.log("clean")
    }
  }, [review])

  const [editorState, setEditorState] = useState(EditorState.createEmpty())

  return (
    <Transition.Root appear show={show} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-10 overflow-y-auto md:min"
        onClose={() => {
          handleClose(false)
        }}
      >
        <Dialog.Overlay className="fixed inset-0 bg-cinder opacity-90 " />
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0" />
          </Transition.Child>
          {/* This element is to trick the browser into centering the modal contents. */}

          <span
            className="inline-block h-screen align-middle"
            aria-hidden="true"
          >
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full md:max-w-2xl max-w-md  my-8 overflow-hidden text-left align-middle transition-all transform bg-bastille shadow-xl rounded-lg opacity-100">
              <Dialog.Title
                as="h3"
                className="text-lg font-bold text-center leading-6 text-selago py-2 bg-bastille-light uppercase"
              >
                <span>Ma critique de</span>
                <span>
                  <MovieTitle
                    originalTitle={original_title}
                    title={title}
                    shadow={false}
                  />
                </span>
              </Dialog.Title>
              <div className="mt-1 p-6">
                <div className="mb-2">
                  <RatingSelector canReset={false} />
                </div>

                <ReviewEditor
                  editorState={editorState}
                  handleChange={setEditorState}
                />
                <div className="flex justify-end space-x-2 mt-5">
                  {!isEmpty(review) && (
                    <button
                      className="text-xs uppercase bg-cinder text-selago px-3 py-1 rounded"
                      onClick={() => {
                        setIsDeletingReview(true)
                        axios
                          .delete(
                            `${process.env.NEXT_PUBLIC_BASE_URL}/api/user/review/delete/${id}/${review?.id}`
                          )
                          .then(() => {
                            mutate(`/api/user/review/${id}`)
                          })
                          .catch((error) => {
                            console.error("delete rview", error)
                          })
                          .finally(() => {
                            setIsDeletingReview(false)
                            handleClose(false)
                          })
                      }}
                    >
                      {isDeletingReview && <ReviewButtonSpinner />}
                      {isDeletingReview ? "Suppression..." : "Supprimer"}
                    </button>
                  )}

                  <button
                    className=" flex items-center  justify-center text-xs uppercase rounded text-selago bg-wild-strawberry-dark px-3 py-1"
                    onClick={() => {
                      const contentState = editorState.getCurrentContent()
                      setIsSendingReview(true)

                      axios
                        .post(`/api/movie/reviews`, {
                          review: JSON.stringify(convertToRaw(contentState)),
                          moviemetaId: id,
                        })
                        .then(() => {
                          mutate(
                            `${process.env.NEXT_PUBLIC_BASE_URL}/api/user/review/${id}`
                          )
                        })
                        .catch((error) => {
                          console.log("error", error)
                        })
                        .finally(() => {
                          handleClose(false)
                          setIsSendingReview(false)
                        })
                    }}
                  >
                    {isSendingReview && <ReviewButtonSpinner />}
                    {isSendingReview ? "Envoi en cours..." : "Envoyer"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Nous vous rappelons qu&apos;il n&apos;est pas permis de tenir
                  de propos violents, diffamatoires ou discriminatoires. Si vous
                  dévoilez des secrets, n&apos;oubliez pas d&apos;utiliser le
                  bouton &apos;spoiler&apos;. Toutes les critiques contraires à
                  notre charte d&apos;écriture seront retirées. Merci de votre
                  compréhension.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  En cliquant sur le bouton &quot;Envoyer votre critique&quot;,
                  vous acceptez les conditions d&apos;utilisations de Tiween
                </p>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

export default ReviewModal
