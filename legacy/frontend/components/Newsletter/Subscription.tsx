import * as React from "react"

import SubscriptionForm from "./SubscriptionForm"

const Subscription: React.FC = () => {
  return (
    <div className="flex flex-col">
      <div className="">
        <div className="font-lato font-black text-3xl text-selago mb-4">
          On reste connectés?
        </div>
        <div className="font-fira text-base flex flex-col space-y-1">
          <p>
            Tiween vous informe chaque semaine de l&apos;actualité du cinéma.
            Les sorties, les horaires et ses bons plans&nbsp;!
          </p>
          <p className="italic font-bold">Allez c&apos;est parti&nbsp;!</p>
        </div>

        <div className="subscription-form-wrapper mt-8">
          <SubscriptionForm />
        </div>
      </div>
    </div>
  )
}

export default Subscription
