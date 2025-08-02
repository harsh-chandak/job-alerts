import { sendFailureDiscordNotification } from '@/utils/failure-notify';
import axios from 'axios';

export default async function handler(req, res) {
  try {
    const { careersApi, headers = [], params = [] } = req.body;

    let final_params = {};
    for (let par of params) {
      if (par?.enabled && par?.key?.trim()) {
        final_params[par.key.trim()] = par.value?.trim?.() || '';
      }
    }

    let final_headers = {};
    for (let head of headers) {
      if (head?.enabled && head?.key?.trim()) {
        final_headers[head.key.trim()] = head.value?.trim?.() || '';
      }
    }

    const response = await axios.get(careersApi, {
      headers: final_headers,
      params: final_params,
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Request failed:', error.response?.data || error.message);
    await sendFailureDiscordNotification(error, `Try API Json response failed.`)
    res.status(error?.response?.status || 500).json({
      error: error?.response?.data || 'Failed to fetch API',
    });
  }
}
