import { NextApiRequest, NextApiResponse } from "next"
import { withSentry } from "@sentry/nextjs"
import SibApiV3Sdk from "sib-api-v3-sdk"
import * as yup from "yup"

const schema = yup.object().shape({ email: yup.string().email() })

const defaultClient = SibApiV3Sdk.ApiClient.instance
const apiKey = defaultClient.authentications["api-key"]
apiKey.apiKey = process.env.SENDINBLUE_API_KEY

const apiInstance = new SibApiV3Sdk.ContactsApi()
const createDoiContact = new SibApiV3Sdk.CreateDoiContact()

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  // res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');

  const { body, method } = req
  try {
    if (method === "POST") {
      //process request
      schema.validateSync(body)
      const { email } = body
      createDoiContact.email = email
      createDoiContact.includeListIds = [process.env.MAIN_NEWSLETTER_ID]
      createDoiContact.templateId = parseInt(
        process.env.MAIN_NEWSLETTER_DO_TEMPLATE_ID
      )
      createDoiContact.redirectionUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/newsletter/subscription/validate`

      await apiInstance.createDoiContact(createDoiContact)
    } else {
      res.setHeader("Allow", ["POST"])
      res.status(405).end(`Method ${method} Not Allowed`)
    }
  } catch (error) {
    res.status(400).end(error.toString())
  }
}
export default withSentry(handler)
