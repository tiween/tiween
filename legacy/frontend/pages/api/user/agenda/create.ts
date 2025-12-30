import { NextApiRequest, NextApiResponse } from "next"
import { withSentry } from "@sentry/nextjs"
import axios from "axios"
import { getSession } from "next-auth/react"

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  const session = await getSession()
  const config = {
    headers: { Authorization: `Bearer ${session.jwt}` },
  }

  const { data: agenda } = await axios.post(
    `${process.env.NEXT_PUBLIC_API_URL}/user-agenda`,
    req.body,
    config
  )

  if (agenda) {
    res.status(200).json(agenda)
  }
}
export default withSentry(handler)
