import { NextApiRequest, NextApiResponse } from 'next';
import { withSentry } from '@sentry/nextjs';

import { request } from '../../../shared/services/strapi';
const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const {
    query: { relatedTo },
  } = req;
  const results = await request(`/creative-works?type_eq=SHORT_MOVIE&id_ne=${relatedTo}&_limit=6`);
  const { data } = results;
  if (data) {
    res.status(200).json(data);
  }
};
export default withSentry(handler);
