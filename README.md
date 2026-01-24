# Lazy Mahasigma - AI Comparison Chrome Extension

Chrome Extension untuk membandingkan respons dari berbagai Large Language Model (LLM) secara simultan dalam satu interface yang intuitif.

## 🎯 Tentang Program

**Lazy Mahasigma** adalah Chrome Extension yang memungkinkan pengguna untuk mendapatkan dan membandingkan respons dari multiple AI models (Google Gemini, Groq Llama, Hugging Face Llama, DeepSeek) secara bersamaan. Extension ini dirancang untuk membantu pengguna mendapatkan perspektif yang lebih luas dari berbagai AI, membandingkan kualitas jawaban, dan memilih respons terbaik untuk kebutuhan mereka.

## 🏗️ Arsitektur Sistem

Program ini terdiri dari dua komponen utama yang saling terintegrasi:

### 1. **Frontend - Chrome Extension** (`/Base`)

Extension browser yang berjalan sebagai popup extension dengan UI modern dan responsif. Dibangun menggunakan vanilla JavaScript, HTML5, dan CSS3 tanpa framework dependencies.

**Teknologi:**
- **Manifest V3** - Chrome Extension format terbaru
- **Vanilla JavaScript** - No frameworks, pure JS untuk performa optimal
- **CSS3** - Modern styling dengan animations dan transitions
- **File Upload API** - Support drag & drop untuk images dan documents

**Komponen Utama:**

- **`manifest.json`** - Extension configuration dengan permissions dan metadata
- **`extention.html`** - Main popup UI structure
- **`main.js`** - Core logic untuk AI selection, API calls, dan UI interactions
- **`style.css`** - Complete styling dengan responsive design

### 2. **Backend - REST API Server** (`/Backend`)

Node.js Express server yang di-deploy sebagai serverless function di Vercel, bertindak sebagai API Gateway untuk multiple AI providers.

**Teknologi:**
- **Node.js + Express.js** - Lightweight web framework
- **Axios** - HTTP client untuk AI provider APIs
- **Vercel Serverless** - Zero-config deployment platform
- **Environment Variables** - Secure API key management

## 🔄 Cara Kerja Program

### Flow Interaksi User

```
1. User membuka extension popup (klik icon di toolbar)
2. User memilih 2 AI models dari pilihan yang tersedia
3. User mengetik prompt/question di textarea
4. (Opsional) User upload gambar/file pendukung
5. User klik submit button
6. Extension mengirim HTTP POST request ke backend
7. Backend memanggil AI providers secara parallel
8. Respons dari kedua AI ditampilkan side-by-side
9. User dapat membandingkan hasil dan memilih yang terbaik
```

### Data Flow Architecture

```
┌─────────────────┐
│  Chrome Popup   │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP POST
         │ x-api-key header
         ▼
┌─────────────────┐
│  Express Server │
│   (Backend)     │
└────────┬────────┘
         │ Parallel Requests
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
┌────────┐ ┌──────┐ ┌────────┐ ┌──────────┐
│ Gemini │ │ Groq │ │   HF   │ │ DeepSeek │
└────────┘ └──────┘ └────────┘ └──────────┘
    │         │          │          │
    └────┬────┴──────────┴──────────┘
         ▼
    JSON Response
         │
         ▼
┌─────────────────┐
│  Comparison UI  │
│  (Side-by-side) │
└─────────────────┘
```

## 🎨 Fitur Utama

### 1. **Multi-AI Comparison**
Extension dapat memanggil hingga 2 AI models secara bersamaan menggunakan `Promise.all()` untuk parallel execution, menghasilkan respons lebih cepat dibanding sequential calls.

### 2. **File Upload Support**
- Drag & drop interface untuk gambar dan dokumen
- Preview thumbnail untuk files yang di-upload
- Support multiple file uploads
- File removal functionality

### 3. **Quota Management System**
- Real-time tracking limit penggunaan per AI model
- Visual progress bars menunjukkan quota remaining
- Default limit: 10 requests per AI per session
- Percentage tooltip untuk monitoring

### 4. **Dynamic UI**
- Auto-expanding textarea berdasarkan input length
- Smooth animations untuk modal transitions
- Notification system untuk user feedback
- Responsive layout yang adapt ke content

### 5. **AI Provider Integration**
Extension terintegrasi dengan 4 AI providers:

**Google Gemini (gemini-1.5-flash)**
- Multi-modal AI dari Google
- Fast inference dengan high quality responses
- Support untuk context-aware conversations

**Groq (llama-3.3-70b-versatile)**
- Ultra-fast inference speed
- Large parameter model (70B) untuk complex reasoning
- OpenAI-compatible API

**Hugging Face (Llama-3.2-3B-Instruct)**
- Open-source model
- Efficient 3B parameter model
- Instruction-tuned untuk chat tasks

**DeepSeek (deepseek-chat)**
- Advanced reasoning capabilities
- Competitive alternative ke GPT models
- Strong performance di coding tasks

## 🔐 Security Features

### API Key Authentication
Backend menggunakan custom authentication middleware yang memvalidasi setiap request:
```javascript
const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
```

### Environment Security
- Semua sensitive credentials (API keys) disimpan di environment variables
- No hardcoded secrets di codebase
- API keys tidak exposed di frontend
- Backend bertindak sebagai proxy untuk hide credentials

### CORS Configuration
- Restricted CORS policy
- Only allows requests dari extension origin
- Prevents unauthorized cross-origin access

## 📊 State Management

Extension menggunakan **client-side state management** untuk tracking:

### Limit Tracking
```javascript
const limits = {
  Gemini: { total: 10, remaining: 10 },
  Groq: { total: 10, remaining: 10 },
  'Hugging Face': { total: 10, remaining: 10 }
};
```

Setiap API call decrement `remaining` counter dan update UI progress bars secara real-time.

### Selected AIs Array
```javascript
let selectedAIs = [];  // Maksimal 2 AI
```

Array ini track AI models yang user pilih untuk comparison. Validation logic mencegah selection lebih dari 2 models.

### File Upload State
```javascript
let uploadedFiles = [];  // Array of File objects
```

Menyimpan files yang user upload untuk dikirim bersama prompt.

## 🎯 Technical Highlights

### Parallel API Calls
Backend menggunakan `Promise.all()` untuk execute multiple AI requests simultaneously:
```javascript
const [response1, response2] = await Promise.all([
  aiMap[ai1](prompt),
  aiMap[ai2](prompt)
]);
```

Ini mengurangi total response time hingga ~50% dibanding sequential calls.

### Error Handling Strategy
- Comprehensive try-catch blocks di semua async operations
- User-friendly error messages
- Server-side error logging untuk debugging
- Graceful degradation jika satu AI fails

### UI/UX Optimizations
- Debounced textarea auto-resize untuk smooth performance
- CSS transitions untuk polished user experience
- Loading states untuk user feedback
- Notification system untuk errors dan warnings

## 🌐 Deployment

### Backend Deployment (Vercel)
Backend di-deploy sebagai serverless function dengan characteristics:
- Auto-scaling berdasarkan traffic
- Global edge network deployment
- Zero configuration deployment
- Environment variables management via dashboard

### Extension Distribution
Extension dapat di-distribute melalui:
1. **Chrome Web Store** - Public distribution
2. **Developer Mode** - Local testing dan private deployment
3. **Enterprise Deployment** - Corporate environments

## 💡 Use Cases

**1. Research & Learning**
Mendapatkan multiple perspectives pada topik complex dengan membandingkan jawaban dari berbagai AI models.

**2. Content Creation**
Membandingkan kualitas output untuk writing tasks, brainstorming ideas dari different AI approaches.

**3. Coding Assistance**
Compare code solutions, debugging approaches, atau explanations dari multiple AI coding assistants.

**4. Decision Making**
Mendapatkan balanced view dengan melihat recommendations dari berbagai AI models sebelum membuat keputusan.

**5. AI Model Evaluation**
Testing dan comparing performance berbagai AI models untuk specific tasks atau domains.

## 📦 Project Structure

```
project_extension/
├── Backend/              # REST API Server
│   ├── server.js        # Main Express app dengan AI integrations
│   ├── package.json     # Dependencies (express, axios, cors, dotenv)
│   ├── vercel.json      # Vercel deployment config
│   └── README.md        # Backend documentation
│
└── Base/                # Chrome Extension
    ├── extention.html   # Popup UI structure
    ├── main.js          # Extension logic & API calls
    ├── style.css        # Complete styling
    ├── manifest.json    # Extension configuration
    └── picture/         # Icons & assets
```

## 🔮 Future Enhancements Potential

- **Conversation History** - Save dan retrieve past comparisons
- **Export Functionality** - Download comparison results
- **Custom Prompts Templates** - Pre-defined prompt templates
- **More AI Providers** - Claude, GPT-4, PaLM integration
- **Advanced Filtering** - Filter responses by criteria
- **Rating System** - User rating untuk AI responses
- **Team Sharing** - Share comparisons dengan team members

---

**Lazy Mahasigma** - Making AI comparison accessible, fast, and intuitive. Built with modern web technologies for optimal performance dan user experience.
