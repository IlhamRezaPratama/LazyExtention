# Lazy Mahasigma Backend

Backend API untuk extension Lazy Mahasigma.

## Deploy ke Vercel (Gratis)

1. Buat akun di https://vercel.com (bisa pakai email/GitHub, tanpa CC)
2. Install Vercel CLI (opsional): `npm install -g vercel`
3. **Cara 1: Lewat Website**
   - Klik "Add New..." → "Project"
   - Import repository atau drag & drop folder Backend
   - Vercel auto-detect settings
   - Tambahkan Environment Variables di Settings:
     - GEMINI_API_KEY
     - GROQ_API_KEY
     - CLAUDE_API_KEY
     - HUGGINGFACE_API_KEY
   - Deploy
4. **Cara 2: Lewat CLI**
   ```bash
   cd Backend
   vercel
   # Follow prompts, set env variables
   vercel --prod
   ```

Setelah deploy, copy URL (mis: https://lazy-mahasigma.vercel.app) dan ganti di extension main.js.

## Local Development

```bash
npm install
node server.js
```

Server jalan di http://localhost:3000
