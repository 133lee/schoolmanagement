Your project is a Next.js monolith. The API lives inside the same codebase under app/api/, not in a separate Express server. That means you deploy one thing, not two.

What you actually have

school-ult-main/
├── app/
│   ├── (dashboard)/      ← React pages (frontend)
│   └── api/              ← API routes (backend) — same app, same process
├── lib/
│   └── db/prisma.ts      ← Database client
├── prisma/
│   └── schema.prisma     ← DB schema
└── ...
The app/api/** routes are serverless/Node.js handlers that Next.js runs alongside the frontend. There is no separate Express server to host elsewhere.

Deployment options
Option 1 — Everything on Render (simplest, recommended)
Deploy the whole Next.js app as a single Web Service on Render, and add a Render PostgreSQL database.


Render Web Service  ←→  Render PostgreSQL
  (Next.js app)           (your database)
  - serves pages
  - serves /api/...
  - runs Prisma queries
Environment variables you'd set on Render:


DATABASE_URL=postgresql://...   ← from Render's DB dashboard
NEXTAUTH_SECRET=...
JWT_SECRET=...
NEXT_PUBLIC_API_URL=https://your-app.onrender.com
Build command: npx prisma generate && npm run build

Start command: npm start

Option 2 — Frontend on Vercel + DB on Render/Neon
Still deploy the whole Next.js app to Vercel (it's made for Next.js), and just point DATABASE_URL at a Render Postgres or Neon database. Vercel handles the API routes natively — no separation needed.


Vercel (Next.js)  ←→  Neon / Render Postgres
  - pages                (managed database)
  - /api/** routes
This is the most common pattern for Next.js apps and requires zero code changes.

Option 3 — Truly split frontend + backend (only if you need it)
This requires significant refactoring — extracting all app/api/** into a standalone Express server. You'd only do this if you need:

The API to be consumed by a mobile app or third party independently
A language/framework other than Node for the backend
Very different scaling requirements
Not worth it for this project in its current form.

Recommendation
Go with Option 2 (Vercel + Neon):

What	Where	Cost
Next.js app (frontend + API)	Vercel	Free tier available
PostgreSQL database	Neon.tech	Free tier (10GB)
Neon gives you a DATABASE_URL connection string, you paste it into Vercel's environment variables, run prisma migrate deploy once, and you're live. No folder restructuring, no refactoring.

The only real prep work before going live is:

Audit your .env — make sure no secrets are hardcoded
Run npx prisma migrate deploy (not dev) in the build step
Set NEXTAUTH_URL / NEXT_PUBLIC_API_URL to your production domain
Make sure JWT_SECRET is a strong random value, not the dev placeholder