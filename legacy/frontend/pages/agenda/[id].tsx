import * as React from "react"
import { GetServerSideProps } from "next"
import Head from "next/head"

import EventBlock from "../../components/Event/EventBlock"
import Layout from "../../components/shared/Layout"
import PageTitle from "../../components/shared/PageTitle"
import Agenda from "../../shared/models/agenda"
import { request } from "../../shared/services/strapi"

export const getServerSideProps: GetServerSideProps = async (context) => {
  const {
    params: { id },
  } = context

  const agenda = await request(`/agenda/${id}`)

  return { props: { agenda } }
}

const AgendaPage: React.FunctionComponent<{ agenda: Agenda }> = ({
  agenda,
}) => {
  return (
    <Layout>
      <Head>
        <title>Tiween: Agenda personnalisé</title>
        <meta
          key="description"
          name="description"
          content={`Découvrez l'agenda: ${agenda.name} sur tiween`}
        />
        <meta key="og-title" name="og:title" content={`${agenda.name}`} />
        <meta
          key="og-image"
          name="og:image"
          content={`${process.env.NEXT_PUBLIC_BASE_URL}/open-graph-facebook.png`}
        />
      </Head>
      <div className="container max-w-6xl px-2">
        <PageTitle>{agenda.name}</PageTitle>
        <div>
          {agenda.events.map((event) => {
            // return <div key={`${item.id}-${event.id}`}>{event.id}</div>;
            return <EventBlock key={`${agenda.id}-${event.id}`} event={event} />
          })}
        </div>
      </div>
    </Layout>
  )
}

export default AgendaPage
