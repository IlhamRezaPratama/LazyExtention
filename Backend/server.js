const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Restricted CORS — only allow extension and Vercel origins
app.use(cors()); // Allow all origins (secured by API Secret)
app.use(express.json());

// API Key Authentication Middleware
const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
};

// Simple in-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute

const rateLimit = (req, res, next) => {
  const key = req.headers['x-api-key'] || req.ip;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, []);
  }

  const requests = rateLimitMap.get(key).filter(t => t > windowStart);
  requests.push(now);
  rateLimitMap.set(key, requests);

  if (requests.length > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  next();
};

// ========================================
// MODEL MAP — 3 Providers × 3 Tiers
// All routed through OpenRouter
// ========================================
const MODEL_MAP = {
  'GPT': {
    flash:  'openai/gpt-4o-mini',
    medium: 'openai/gpt-4o',
    high:   'openai/o4-mini'
  },
  'Gemini': {
    flash:  'google/gemini-2.0-flash-001',
    medium: 'google/gemini-2.5-flash',
    high:   'google/gemini-2.5-pro'
  },
  'Claude': {
    flash:  'anthropic/claude-3.5-haiku',
    medium: 'anthropic/claude-sonnet-4',
    high:   'anthropic/claude-opus-4'
  }
};

// ========================================
// Universal OpenRouter Call
// ========================================
async function callOpenRouter(prompt, images, modelId) {
  if (!process.env.OPENROUTER_AI) {
    return 'Error: OpenRouter API key belum dikonfigurasi. Tambahkan OPENROUTER_AI di environment variables.';
  }

  try {
    // Build content array (support text + vision)
    let content = [];

    if (prompt) {
      content.push({ type: 'text', text: prompt });
    }

    if (images && images.length > 0) {
      images.forEach(img => {
        content.push({
          type: 'image_url',
          image_url: { url: img }
        });
      });
    }

    // If no images, simplify content to just string for non-vision models
    const messageContent = (images && images.length > 0) ? content : prompt;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: modelId,
        messages: [{ role: 'user', content: messageContent }],
        temperature: 0.7,
        max_tokens: 2048
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_AI}`,
          'HTTP-Referer': 'https://lazy-extention.vercel.app',
          'X-Title': 'Lazy Extension',
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(`OpenRouter Error [${modelId}]:`, error.response?.data || error.message);
    return `Error: ${error.response?.data?.error?.message || error.message}`;
  }
}

// ========================================
// Helper: Resolve model ID from provider + tier
// ========================================
function resolveModelId(ai, tier) {
  const provider = MODEL_MAP[ai];
  if (!provider) return null;
  return provider[tier] || provider['flash']; // Default to flash if tier invalid
}

// ========================================
// Chat Endpoint — single AI call
// ========================================
app.post('/api/chat', authenticateAPIKey, rateLimit, async (req, res) => {
  const startTime = Date.now();
  try {
    const { ai, tier = 'flash', prompt, images } = req.body;

    if (!ai || (!prompt && (!images || images.length === 0))) {
      return res.status(400).json({ error: 'Missing AI provider or prompt/images' });
    }

    const modelId = resolveModelId(ai, tier);
    if (!modelId) {
      return res.status(400).json({
        error: `Invalid AI name. Available: ${Object.keys(MODEL_MAP).join(', ')}`,
        availableTiers: ['flash', 'medium', 'high']
      });
    }

    const responseText = await callOpenRouter(prompt, images, modelId);

    res.json({
      ai: ai,
      tier: tier,
      model: modelId,
      response: responseText,
      responseTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal server error', responseTime: Date.now() - startTime });
  }
});

// ========================================
// Compare Endpoint — 2 AI side-by-side
// ========================================
app.post('/api/compare', authenticateAPIKey, rateLimit, async (req, res) => {
  const startTime = Date.now();
  try {
    const { ai1, tier1 = 'flash', ai2, tier2 = 'flash', prompt, images } = req.body;

    if (!ai1 || !ai2 || !prompt) {
      return res.status(400).json({ error: 'Missing required fields: ai1, ai2, prompt' });
    }

    const modelId1 = resolveModelId(ai1, tier1);
    const modelId2 = resolveModelId(ai2, tier2);

    if (!modelId1 || !modelId2) {
      return res.status(400).json({
        error: `Invalid AI name. Available: ${Object.keys(MODEL_MAP).join(', ')}`,
        availableTiers: ['flash', 'medium', 'high']
      });
    }

    const [response1, response2] = await Promise.all([
      callOpenRouter(prompt, images, modelId1),
      callOpenRouter(prompt, images, modelId2)
    ]);

    res.json({
      ai1: { name: ai1, tier: tier1, model: modelId1, response: response1 },
      ai2: { name: ai2, tier: tier2, model: modelId2, response: response2 },
      responseTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal server error', responseTime: Date.now() - startTime });
  }
});

// ========================================
// Health Check
// ========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Lazy Mahasigma API is running',
    providers: Object.keys(MODEL_MAP),
    tiers: ['flash', 'medium', 'high'],
    models: MODEL_MAP,
    timestamp: new Date().toISOString()
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
