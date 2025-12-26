import { withSentry } from '@sentry/nextjs';
import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const session = await getSession({ req });

  const config = {
    headers: { Authorization: `Bearer ${session.jwt}` },
  };

  const {
    query: { ratingId },
  } = req;

  try {
    const { data } = await axios.delete(
      `${process.env.NEXT_PUBLIC_API_URL}/user-ratings/${ratingId}`,
      config,
    );

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
export default withSentry(handler);
