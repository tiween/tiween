import { withSentry } from '@sentry/nextjs';
import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const session = await getSession({ req });

  const config = {
    headers: { Authorization: `Bearer ${session.jwt}` },
  };
  const { event, agenda } = req.body;
  try {
    const { data } = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/user-agenda/add-event`,
      {
        event,
        agenda,
      },
      config,
    );
    return res.status(200).json(data);
  } catch (error) {
    console.error('error', error);
  }
};
export default withSentry(handler);
