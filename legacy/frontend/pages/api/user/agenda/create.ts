import { withSentry } from '@sentry/nextjs';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import axios from 'axios';
const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const session = await getSession();
  const config = {
    headers: { Authorization: `Bearer ${session.jwt}` },
  };

  const { data: agenda } = await axios.post(
    `${process.env.NEXT_PUBLIC_API_URL}/user-agenda`,
    req.body,
    config,
  );

  if (agenda) {
    res.status(200).json(agenda);
  }
};
export default withSentry(handler);
