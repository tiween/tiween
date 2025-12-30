import { NextApiRequest, NextApiResponse } from "next"
import { withSentry } from "@sentry/nextjs"
import axios from "axios"
import { getSession } from "next-auth/react"

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  const session = await getSession({ req })

  const config = {
    headers: { Authorization: `Bearer ${session.jwt}` },
  }
  const {
    query: { moviemetaId },
  } = req

  const { data: comments } = await axios.get(
    `${process.env.NEXT_PUBLIC_API_URL}/comments/moviemeta:${moviemetaId}`,
    config
  )

  if (comments.length > 0) {
    res.status(200).json(comments[0])
  } else {
    res.status(200).json({})
  }
}
export default withSentry(handler)
