import React from "react"
// import LanguageSwitcher from '../components/shared/LanguageSwitcher';
import { useRouter } from "next/router"
import algoliasearch from "algoliasearch"
import { InstantSearch } from "react-instantsearch-dom"

import CreativeWorkBaseFilters from "../components/CreativeWork/CreativeWorkBaseFilters"
import PlayHits from "../components/Play/PlayHits"
import CurrentRefinements from "../components/Search/CurrentRefinements"
import Layout from "../components/shared/Layout"
import PageTitle from "../components/shared/PageTitle"

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY
)
const PlaysHomePage: React.FunctionComponent = () => {
  const { locale } = useRouter()
  const indexName = `${process.env.NODE_ENV}_plays-${locale}`
  return (
    <Layout>
      <div className="container max-w-6xl">
        <div>
          <div className="px-4 mb-3 md:text-left text-center">
            <PageTitle>Théâtre & Danse</PageTitle>
          </div>
          <div className="">
            <InstantSearch indexName={indexName} searchClient={searchClient}>
              <div className="flex justify-between border-t border-b border-mulled-wine text-base text-selago font-bold px-4 mb-3">
                <CreativeWorkBaseFilters />
                {/* <LanguageSwitcher /> */}
              </div>
              <CurrentRefinements />
              <div className="container px-2">
                <PlayHits />
              </div>
            </InstantSearch>
          </div>
        </div>
        {/* Image */}
      </div>
    </Layout>
  )
}

export default PlaysHomePage
