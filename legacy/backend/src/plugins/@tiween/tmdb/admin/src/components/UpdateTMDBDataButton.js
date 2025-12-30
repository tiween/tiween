import React, { useState } from "react"
import { Button } from "@strapi/design-system/Button"
import {
  useCMEditViewDataManager,
  useNotification,
} from "@strapi/helper-plugin"

import moviemetaRequests from "../api/moviemeta"

function UpdateTMDBDataButton() {
  const modelUID = "api::moviemeta.moviemeta"
  const [loading, setLoading] = useState(false)
  const { slug, status, initialData } = useCMEditViewDataManager()
  const toggleNotification = useNotification()

  if (slug === modelUID && status === "resolved") {
    const { tmdbid, id } = initialData

    return (
      <Button
        variant="default"
        loading={loading}
        onClick={() => {
          setLoading(true)
          moviemetaRequests
            .syncWithTMDB(tmdbid, id)
            .then(() => {
              setLoading(false)
              toggleNotification({
                type: "success",
                message: "TMDB Data successfuly updated",
              })
            })
            .catch((error) => {
              toggleNotification({
                type: "error",
                message: error.message,
              })
              console.error(error)
            })
        }}
      >
        Update TMDB
      </Button>
    )
  }

  return null
}

export default UpdateTMDBDataButton
