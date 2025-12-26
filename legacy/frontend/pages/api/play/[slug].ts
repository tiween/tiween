import { withSentry } from '@sentry/nextjs';
import { NextApiRequest, NextApiResponse } from 'next';
import { request } from '../../../shared/services/strapi';

const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  // res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');

  const {
    query: { slug },
  } = req;

  try {
    const response = await request(`/creative-work/${slug}`);
    const { data: work } = response;
    if (work) {
      res.status(200).json(work);
    }
  } catch (error) {
    console.log('ERROR', error);
  }
};
export default withSentry(handler);
