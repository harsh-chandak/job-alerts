import axios from 'axios';

export default async function handler(req, res) {
  try {
    const { careersApi, headers, params } = req.body;
    let final_params = {}
    for(let par of params){
      if (par?.enabled){
        final_params[par?.key] = par?.value
      }
    }
    let final_headers = {}
    for(let head of headers){
      if (head?.enabled){
        final_headers[head?.key] = head?.value
      }
    }
    const response = await axios.get(careersApi, {
      headers: final_headers ? final_headers : {},
      params: final_params ? final_params : {},
    });
    
    res.status(200).json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch API' });
  }
}
