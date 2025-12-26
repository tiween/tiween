import { withSentry } from '@sentry/nextjs';
import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import qs from 'qs';

const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const { method } = req;
  if (method === 'DELETE') {
    const session = await getSession();

    const config = {
      headers: { Authorization: `Bearer ${session.jwt}` },
    };

    const {
      query: { moviemetaId, reviewId },
    } = req;

    const params = qs.stringify({
      authorId: session.id,
    });

    try {
      const { data } = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/comments/moviemeta:${moviemetaId}/${reviewId}?${params}`,
        config,
      );
      res.status(200).json(data);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(405).end();
  }
};
export default withSentry(handler);
