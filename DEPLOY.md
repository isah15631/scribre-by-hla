# Deploying Scribre by HLA

Scribre is split across **two free hosts**:

```
  Browser ──► Netlify (frontend, static site)
                 │
                 └── calls API ──► Render (backend: Express + ffmpeg + Gemini)
                                      └── holds your GEMINI_API_KEY (never public)
```

- **Netlify** serves the React UI. It cannot run the transcription engine (no
  long-lived server), so it only hosts the frontend.
- **Render** runs the backend that uploads/splits audio and calls Gemini. Your
  API key lives here, safe from site visitors.

You only set up each host once. After that, every `git push` redeploys both.

---

## 0. Prerequisites (all free)

1. A **GitHub** account — both hosts deploy from a Git repo.
2. A **Render** account — https://render.com (sign in with GitHub).
3. A **Netlify** account — https://netlify.com (sign in with GitHub).
4. Your **Gemini API key** — https://aistudio.google.com/apikey
   (you already have one in your local `.env`).

> Your key is **never** committed: `.env` is gitignored. You'll paste the key
> into the Render dashboard instead.

---

## 1. Push the code to GitHub

From the project folder (`scribre-by-hla`), in a terminal:

```bash
git init
git add .
git commit -m "Scribre: long-audio transcription, ready to deploy"
```

Then create an empty repo on GitHub (github.com → New repository, e.g.
`scribre-by-hla`, leave it empty), and connect + push:

```bash
git remote add origin https://github.com/YOUR-USERNAME/scribre-by-hla.git
git branch -M main
git push -u origin main
```

> Double-check `.env` did **not** get pushed (GitHub should show `.env.example`
> but **no** `.env`). If you ever see your real key on GitHub, rotate it.

---

## 2. Deploy the backend to Render

The repo includes `render.yaml`, so Render can set itself up:

1. Render Dashboard → **New +** → **Blueprint**.
2. Connect your GitHub and pick the `scribre-by-hla` repo.
3. Render reads `render.yaml` and shows a service named **scribre-api**. Click
   **Apply** / **Create**.
4. When it asks for (or after it's created, under the service →
   **Environment**), add the secret:
   - **Key:** `GEMINI_API_KEY`  **Value:** *(your Gemini key)*
5. Wait for the first build/deploy to finish (a few minutes).
6. Copy the service URL at the top — it looks like
   **`https://scribre-api.onrender.com`**. You'll need it for Netlify.

**Verify the backend:** open `https://scribre-api.onrender.com/api/health` in a
browser — you should see `{"status":"ok", ...}`.

> Prefer clicking over the blueprint? Instead of step 1–3 you can do **New +
> → Web Service**, pick the repo, and set: Runtime **Node**, Build command
> `npm install && npm run build`, Start command `npm start`, and add the env
> vars `NODE_ENV=production` and `GEMINI_API_KEY=...`.

---

## 3. Deploy the frontend to Netlify

1. Netlify → **Add new site** → **Import an existing project** → pick the same
   GitHub repo.
2. Netlify reads `netlify.toml`, so build settings auto-fill
   (build = `npm install && npx vite build`, publish = `dist`). Leave them.
3. **Before** the first deploy (or under Site configuration → Environment
   variables afterward), add:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** your Render URL, e.g. `https://scribre-api.onrender.com`
     (no trailing slash)
4. Deploy. If you added the variable *after* the first deploy, trigger a
   redeploy (Deploys → **Trigger deploy**) so it gets baked in.
5. Netlify gives you a site URL like **`https://your-site.netlify.app`**.

> `VITE_API_BASE_URL` is read at **build time** and baked into the site. If you
> change it, you must redeploy for it to take effect.

---

## 4. (Recommended) Lock the backend to your site

Right now any site could call your backend. To restrict it to your Netlify site:

1. Render → service → **Environment** → add:
   - **Key:** `ALLOWED_ORIGIN`  **Value:** `https://your-site.netlify.app`
2. Save (Render redeploys automatically).

---

## 5. Test it

Open your Netlify URL, upload an audio file, and confirm a transcript appears.

---

## Things to know (free-tier quirks)

- **Cold start:** Render's free service sleeps after ~15 min idle. The *first*
  request after a nap takes ~50s to wake up, so the first transcription may seem
  to hang — just wait. While you're actively using it, it stays awake.
- **Long jobs:** A transcription runs in the backend's memory. If Render
  restarts mid-job (rare), that job is lost — just re-upload. The browser polls
  every ~1.5s, which keeps the service awake during a job.
- **Big files:** The upload goes straight from the browser to Render (it does
  **not** pass through Netlify), so Netlify's size limits don't apply. Very large
  files (multi-hour) work, but on the free 512 MB Render instance keep an eye on
  it; upgrading the Render plan helps if you process huge files often.
- **Gemini free tier:** ~10 requests/min, ~250–1,500/day. A 2 hr file uses
  ~8 requests. Plenty for normal use.

---

## Local development (unchanged)

Nothing about deployment affects local dev. Keep your key in `.env` and run:

```bash
npm run dev
```

Locally the frontend calls `/api` on the same server (no `VITE_API_BASE_URL`
needed), so it all runs from `http://localhost:3000`.
