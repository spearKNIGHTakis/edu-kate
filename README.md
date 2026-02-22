# EduManage Pro 🎓

A full-featured school management system built with **React 18** and **Supabase**.

## Features

- 📊 Dashboard with live stats and charts
- 👨‍🎓 Student management (CRUD)
- 👩‍🏫 Teacher management (CRUD)
- ✅ Daily attendance tracking
- 📈 Grades & assessments
- 💰 Fee management & payment tracking
- 📢 Announcements system

---

## 1. Local Development

### Prerequisites
- Node.js 18+
- npm 9+
- A [Supabase](https://supabase.com) account (free tier works)

### Install

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your real Supabase credentials:

```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGci...
```

> Find these in your Supabase project: **Settings → API**

### Set up database

1. Open your Supabase project → **SQL Editor**
2. Copy the SQL from the **Settings** page inside the app (or from the schema in `src/App.js`)
3. Run it — this creates all 6 tables with RLS policies

### Start the app

```bash
npm install 
```

App runs at [http://localhost:3000](http://localhost:3000)

---

## 2. Push to GitHub

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: EduManage Pro"

# Create repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/edumanage-pro.git
git branch -M main
git push -u origin main
```

---

## 3. Deploy to Vercel

### Option A — Vercel CLI

```bash
npm install -g vercel
vercel login
vercel

# Follow prompts:
# Framework: Create React App
# Build command: npm run build
# Output directory: build
```

### Option B — Vercel Dashboard (recommended)

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Vercel auto-detects Create React App — click **Deploy**
4. After deploy, go to **Settings → Environment Variables** and add:
   - `REACT_APP_SUPABASE_URL` = your Supabase URL
   - `REACT_APP_SUPABASE_ANON_KEY` = your anon key
5. Go to **Deployments → Redeploy** to apply the env vars

Your app will be live at `https://your-project.vercel.app` 🚀

---

## Project Structure

```
edumanage-pro/
├── public/
│   └── index.html
├── src/
│   ├── App.js        # All components & logic
│   ├── App.css       # All styles
│   └── index.js      # React entry point
├── .env.example      # Env var template
├── .gitignore
├── vercel.json       # SPA routing for Vercel
├── package.json
└── README.md
```

## Tech Stack

| Layer     | Technology                  |
|-----------|-----------------------------|
| Frontend  | React 18                    |
| Database  | Supabase (PostgreSQL)       |
| Auth      | Supabase (extendable)       |
| Hosting   | Vercel                      |
| Styles    | Pure CSS (no UI library)    |




Demo credentials:
RoleEmailPasswordAdminadmin@school.eduadmin123//Teacherjames@school.eduteacher123