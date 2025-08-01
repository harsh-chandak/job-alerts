// /pages/api/check-method.js
import { analyzeCareersPage } from '@/utils/analyzePage';

export default async function handler(req, res) {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Missing URL' });
  }

  const result = await analyzeCareersPage(url);
  res.status(200).json(result);
}
