import { NextApiRequest, NextApiResponse } from "next"
import { withSentry } from "@sentry/nextjs"
import axios from "axios"
import get from "lodash/get"

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  const {
    body: { email },
  } = req

  try {
    const results = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`,
      {
        email,
      }
    )
    res.status(200).json(results.data)
  } catch (error) {
    const messages = get(
      error,
      ["response", "data", "message", 0, "messages"],
      null
    )
    res.status(400).json({ ok: false, messages })
  }
}
export default withSentry(handler)
