const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Key Authentication Middleware
const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
};

// API Keys
const API_KEYS = {
  GEMINI: process.env.GEMINI_API_KEY,
  GROQ: process.env.GROQ_API_KEY,
  HUGGINGFACE: process.env.HUGGINGFACE_API_KEY
};

// Endpoint untuk Gemini
async function callGemini(prompt) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEYS.GEMINI}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }]
      }
    );
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini Error:', error.message);
    return `Error: ${error.message}`;
  }
}

// Endpoint untuk Groq
async function callGroq(prompt) {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'mixtral-8x7b-32768',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEYS.GROQ}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Groq Error:', error.message);
    return `Error: ${error.message}`;
  }
}


// Endpoint untuk Hugging Face
async function callHuggingFace(prompt) {
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEYS.HUGGINGFACE}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data[0].generated_text;
  } catch (error) {
    console.error('Hugging Face Error:', error.message);
    return `Error: ${error.message}`;
  }
}

// Single AI chat endpoint
app.post('/api/chat', authenticateAPIKey, async (req, res) => {
  try {
    const { ai, prompt } = req.body;

    if (!ai || !prompt) {
      return res.status(400).json({ error: 'Missing required fields: ai, prompt' });
    }

    const aiMap = {
      'Gemini': callGemini,
      'Groq': callGroq,
      'Hugging Face': callHuggingFace
    };

    if (!aiMap[ai]) {
      return res.status(400).json({ error: 'Invalid AI name' });
    }

    const response = await aiMap[ai](prompt);

    res.json({
      ai: ai,
      response: response
    });

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/compare', authenticateAPIKey, async (req, res) => {
  try {
    const { ai1, ai2, prompt } = req.body;

    if (!ai1 || !ai2 || !prompt) {
      return res.status(400).json({ error: 'Missing required fields: ai1, ai2, prompt' });
    }

    const aiMap = {
      'Gemini': callGemini,
      'Groq': callGroq,
      'Hugging Face': callHuggingFace
    };

    const [response1, response2] = await Promise.all([
      aiMap[ai1](prompt),
      aiMap[ai2](prompt)
    ]);

    res.json({
      ai1: { name: ai1, response: response1 },
      ai2: { name: ai2, response: response2 }
    });

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
