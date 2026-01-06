<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# No Tengo Nada Para Ponerme - Fashion AI App

Tu armario digital con IA. Digitaliza tu ropa, genera outfits y comparte con amigos.

View app in AI Studio: https://ai.studio/apps/drive/1fgg6Msye2xkOv-KYfRRnodxHFlpxd4GC

## ✨ Características

- 🤖 **Análisis AI de prendas** - Gemini Vision API analiza automáticamente tus fotos
- 👗 **Armario digital** - Gestiona todas tus prendas en un solo lugar
- ✨ **Generación de outfits** - IA sugiere combinaciones basadas en tu estilo
- 🎒 **Smart Packer** - Lista de equipaje inteligente para viajes
- 👥 **Social** - Comparte outfits y "presta" prendas de amigos
- 🌙 **Dark mode** - Tema oscuro/claro automático
- 📱 **Responsive** - Funciona perfecto en móvil y desktop

## 🏗️ Arquitectura

### Frontend
- React 18 + TypeScript
- Vite para build ultrarrápido
- TailwindCSS para estilos
- Google Gemini AI (Vision + Pro)

### Backend (Completo)
- ✅ **Supabase** - PostgreSQL + Auth + Storage
- ✅ **Edge Functions** - Proxy seguro para AI
- ✅ **Row Level Security** - Seguridad a nivel de fila
- ✅ **Feature Flags** - Migración gradual sin breaking changes
- ✅ **Migración automática** - De localStorage a Supabase

**Ver:** [BACKEND_IMPLEMENTATION.md](./BACKEND_IMPLEMENTATION.md) para detalles completos.

## 🚀 Run Locally

**Prerequisites:** Node.js 18+

### Modo Local (sin backend)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables in `.env.local`:
   ```env
   VITE_GEMINI_API_KEY=tu_gemini_api_key
   ```

   **Tip**: Use `npm run verify-setup` to check configuration

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

### Modo Full Stack (con Supabase)

1. Install dependencies + Supabase CLI:
   ```bash
   npm install
   npm install -g supabase
   ```

2. Initialize Supabase:
   ```bash
   supabase init
   supabase start
   ```

3. Set environment variables in `.env.local`:
   ```env
   VITE_GEMINI_API_KEY=tu_gemini_api_key
   VITE_SUPABASE_URL=tu_supabase_url
   VITE_SUPABASE_ANON_KEY=tu_anon_key
   ```

4. Apply migrations:
   ```bash
   supabase db push
   ```

5. Deploy Edge Functions:
   ```bash
   supabase functions deploy analyze-clothing
   supabase functions deploy generate-outfit
   supabase functions deploy generate-packing-list
   ```

6. Run the app:
   ```bash
   npm run dev
   ```

7. Activate backend features in `src/config/features.ts`

**Ver:** [BACKEND_IMPLEMENTATION.md](./BACKEND_IMPLEMENTATION.md) para guía completa.

## 📚 Documentación

- [BACKEND_IMPLEMENTATION.md](./BACKEND_IMPLEMENTATION.md) - Implementación completa del backend
- [SETUP.md](./SETUP.md) - Configuración de Supabase
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deploy a producción
- [EXECUTION_PLAN.md](./EXECUTION_PLAN.md) - Plan de migración original

## 🛠️ Tech Stack

**Frontend:**
- React 18
- TypeScript
- Vite
- TailwindCSS
- Google Gemini AI

**Backend:**
- Supabase (PostgreSQL)
- Supabase Auth
- Supabase Storage
- Edge Functions (Deno)
- Row Level Security

**AI:**
- Gemini 2.0 Flash (Vision)
- Gemini 2.5 Pro (Text)

## 📦 Project Structure

```
.
├── src/
│   ├── config/          # Feature flags
│   ├── hooks/           # React hooks
│   ├── services/        # API services
│   ├── components/      # UI components
│   ├── lib/             # Supabase client
│   └── types/           # TypeScript types
├── supabase/
│   ├── migrations/      # DB migrations
│   └── functions/       # Edge Functions
├── components/          # React components
└── services/            # Gemini service (legacy)
```

## 🚢 Deploy

### Vercel / Netlify (Frontend)

1. Connect repo
2. Set environment variables
3. Deploy

### Supabase (Backend)

1. Create project
2. Link local → remote
3. Push migrations
4. Deploy functions
5. Update env variables

**Ver:** [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🤖 Gemini AI Configuration

The app uses Google Gemini AI for 26+ AI-powered features. Configuration is split between:
- **Frontend**: Direct API calls in development (`VITE_GEMINI_API_KEY`)
- **Backend**: Secure Edge Functions in production (`GEMINI_API_KEY` in Supabase)

### Quick Setup
```bash
# 1. Verify configuration
npm run verify-setup

# 2. For issues, check:
- GEMINI_README.md (quick reference)
- GEMINI_SETUP_COMPLETE.md (full setup guide)
- GEMINI_CONFIGURATION_ANALYSIS.md (technical details)
```

### Available Features (26 AI Functions)
- **Edge Functions** (3): analyze-clothing, generate-outfit, generate-packing-list
- **Direct API** (23): virtual try-on, fashion chat, weather outfits, shopping assistant, and more

**Full documentation**: See `GEMINI_README.md` for complete reference.

## 📝 License

MIT

## 🤝 Contributing

Pull requests welcome!

---

Made with ❤️ using Google Gemini AI & Supabase
