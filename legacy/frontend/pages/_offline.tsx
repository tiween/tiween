import * as React from "react"

import Layout from "../components/shared/Layout"

const OfflinePage: React.FunctionComponent = () => {
  return (
    <Layout>
      <div className="container h-screen w-full flex flex-col">
        <img src="/images/lost.gif" alt="offline" />
        <h1 className="font-lato text-4xl text-center">
          Oops les internet ne fonctionnent plus!{" "}
          <span role="img" aria-label="confused">
            😵
          </span>
        </h1>
      </div>
    </Layout>
  )
}

export default OfflinePage
