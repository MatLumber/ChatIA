// src/pages/api/chat.js

import { sendMessage } from '../../lib/openai';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { message, history } = req.body;
    try {
      const response = await sendMessage(message, history);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Failed to send message' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
