/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import React, { createContext, useContext, useState } from "react"

import { MovieMeta } from "../models/moviemeta"

const MovieContext = createContext(null)

interface MovieProviderProps {
  moviemeta: MovieMeta
  children: React.ReactNode
}
export const MovieProvider: React.FC<MovieProviderProps> = ({
  moviemeta,
  children,
}) => {
  const [currentMovie] = useState(moviemeta)
  return (
    <MovieContext.Provider value={currentMovie}>
      {children}
    </MovieContext.Provider>
  )
}

export const useMovie = (): MovieMeta => useContext(MovieContext)
