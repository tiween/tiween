import { withSentry } from '@sentry/nextjs';
import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const session = await getSession({ req });

  const config = {
    headers: { Authorization: `Bearer ${session.jwt}` },
  };

  const { data: agendas } = await axios.get(
    `${process.env.NEXT_PUBLIC_API_URL}/user/user-agenda-with-relations`,
    config,
  );

  if (agendas) {
    res.status(200).json(agendas);
  }
};
export default withSentry(handler);
