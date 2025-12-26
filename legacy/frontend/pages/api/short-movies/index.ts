import { NextApiRequest, NextApiResponse } from 'next';
import { withSentry } from '@sentry/nextjs';

import { request } from '../../../shared/services/strapi';
const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const results = await request('/creative-works?type_eq=SHORT_MOVIE');
  const { data: works } = results;
  if (works) {
    res.status(200).json(works);
  }
};
export default withSentry(handler);
