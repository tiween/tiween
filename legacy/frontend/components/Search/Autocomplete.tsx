/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ReactElement } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import {
  AutocompleteOptions,
  AutocompleteState,
  createAutocomplete,
} from "@algolia/autocomplete-core"
import { getAlgoliaResults } from "@algolia/autocomplete-js"
import { Hit } from "@algolia/client-search"
import SearchIcon from "@heroicons/react/solid/SearchIcon"
import algoliasearch from "algoliasearch/lite"
import get from "lodash/get"
import slugify from "slugify"

import { MediumHit, MovieHit } from "./hit-types"
import MediumSearchResultItem from "./MediumSearchResultItem"
import MovieSearchResultItem from "./MovieSearchResultItem"

const TITLES = {
  media: "Salles",
  movies: "Films",
}

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY
)
type AutocompleteItem = Hit<MovieHit | MediumHit>

export default function Autocomplete(
  props: Partial<AutocompleteOptions<AutocompleteItem>>
): ReactElement {
  const [autocompleteState, setAutocompleteState] = React.useState<
    AutocompleteState<AutocompleteItem>
  >({
    collections: [],
    completion: null,
    context: {},
    isOpen: false,
    query: "",
    activeItemId: null,
    status: "idle",
  })
  const router = useRouter()
  const autocomplete = React.useMemo(
    () =>
      createAutocomplete<
        AutocompleteItem,
        React.BaseSyntheticEvent,
        React.MouseEvent,
        React.KeyboardEvent
      >({
        id: "mobile-search",
        onStateChange({ state }) {
          setAutocompleteState(state)
        },
        getSources() {
          return [
            {
              sourceId: "movies",
              getItems({ query }) {
                return getAlgoliaResults({
                  searchClient,
                  queries: [
                    {
                      indexName: "production_movies",
                      query,
                      params: {
                        hitsPerPage: 5,
                        highlightPreTag: "<mark>",
                        highlightPostTag: "</mark>",
                      },
                    },
                  ],
                })
              },

              templates: {
                item({ item }) {
                  return <MovieSearchResultItem hit={item} />
                },
              },
            },
            {
              sourceId: "media",
              getItems({ query }) {
                return getAlgoliaResults({
                  searchClient,
                  queries: [
                    {
                      indexName: "production_medium",
                      query,
                      params: {
                        hitsPerPage: 5,
                        highlightPreTag: "<mark>",
                        highlightPostTag: "</mark>",
                      },
                    },
                  ],
                })
              },
              getItemUrl({ item }) {
                return `/medium/${item?.slug}/${item?.objectID}`
              },
              onSelect({ itemUrl }) {
                return router.push(itemUrl)
              },
            },
          ]
        },
        ...props,
      }),
    [props, router]
  )

  const inputRef = React.useRef<HTMLInputElement>(null)
  const formRef = React.useRef<HTMLFormElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const { getEnvironmentProps } = autocomplete

  React.useEffect(() => {
    if (!formRef.current || !panelRef.current || !inputRef.current) {
      return undefined
    }
    const { onTouchStart, onTouchMove } = getEnvironmentProps({
      formElement: formRef.current,
      inputElement: inputRef.current,
      panelElement: panelRef.current,
    })

    window.addEventListener("touchstart", onTouchStart)
    window.addEventListener("touchmove", onTouchMove)
    return () => {
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
    }
  }, [getEnvironmentProps, formRef, inputRef, panelRef])

  return (
    <div
      className="autocomplete-wrapper  text-selago pt-10"
      {...autocomplete.getRootProps({})}
    >
      <div className="search-input-outer-wrapper fixed inset-x-6 bg-cinder pb-2 shadow z-50">
        <form
          ref={formRef}
          {...autocomplete.getFormProps({ inputElement: inputRef.current })}
        >
          <div className="search-input-inner-wrapper bg-mulled-wine rounded flex justify-between items-center w-full pl-3 space-x-1">
            <SearchIcon className="text-selago h-5 w-5 flex-none" />
            <input
              className="flex-grow mobile-search-field  py-3 text-base text-selago placeholder-selago bg-transparent focus:outline-none"
              placeholder="Rechercher un film ou une salle..."
              ref={inputRef}
              {...autocomplete.getInputProps({
                inputElement: inputRef.current,
              })}
            />
          </div>
        </form>
      </div>

      <div className="results-outer-wrapper pt-20">
        <div
          className="aa-Panel min-h-full flex-col  text-selago overflow-y-scroll"
          ref={panelRef}
          {...autocomplete.getPanelProps({})}
        >
          {autocompleteState?.isOpen &&
            autocompleteState?.collections.map((collection) => {
              const { source, items } = collection

              return items.length > 0 ? (
                <div
                  key={`source-${source.sourceId}`}
                  className="aa-Source w-full mb-2"
                >
                  <div className="text-lg divide-y-2">
                    {TITLES[source.sourceId]}
                  </div>
                  {items.length > 0 && (
                    <div
                      className="aa-List flex flex-col space-y-1"
                      {...autocomplete.getListProps()}
                    >
                      {items.map((item) => {
                        if (source.sourceId === "movies") {
                          item as MovieHit
                          const title = get(item, "title")
                          return (
                            <Link
                              href={`/film/${slugify(title)}/${item.objectID}`}
                              key={item.objectID}
                              {...autocomplete.getItemProps({ item, source })}
                              passHref
                            >
                              <a>
                                <MovieSearchResultItem hit={item} />
                              </a>
                            </Link>
                          )
                        } else {
                          item as MediumHit
                          const name = get(item, "name")
                          return (
                            <Link
                              href={`/medium/${slugify(name)}/${item.objectID}`}
                              key={item.objectID}
                              {...autocomplete.getItemProps({ item, source })}
                              passHref
                            >
                              <a>
                                <MediumSearchResultItem
                                  key={item.objectID}
                                  hit={item}
                                />
                              </a>
                            </Link>
                          )
                        }
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <></>
              )
            })}
        </div>
      </div>
    </div>
  )
  return
}
