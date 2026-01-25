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
  HUGGINGFACE: process.env.HUGGINGFACE_API_KEY,
  DEEPSEEK: process.env.DEEPSEEK_API_KEY
};

// Endpoint untuk Gemini
async function callGemini(prompt) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEYS.GEMINI}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }]
      }
    );
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini Error:', error.response?.data || error.message);
    return `Error: ${error.response?.data?.error?.message || error.message}`;
  }
}

// Endpoint untuk Groq
async function callGroq(prompt) {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1024
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
      'https://router.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct',
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          return_full_text: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEYS.HUGGINGFACE}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (Array.isArray(response.data) && response.data[0]?.generated_text) {
      return response.data[0].generated_text;
    } else if (response.data?.generated_text) {
      return response.data.generated_text;
    } else {
      return 'Error: Unexpected response format';
    }
  } catch (error) {
    console.error('Hugging Face Error:', error.response?.data || error.message);
    return `Error: ${error.response?.data?.error || error.message}`;
  }
}

// Endpoint untuk DeepSeek
async function callDeepSeek(prompt) {
  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1024
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEYS.DEEPSEEK}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek Error:', error.response?.data || error.message);
    return `Error: ${error.response?.data?.error?.message || error.message}`;
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
      'Hugging Face': callHuggingFace,
      'DeepSeek': callDeepSeek
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
      'Hugging Face': callHuggingFace,
      'DeepSeek': callDeepSeek
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
