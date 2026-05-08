# 💰 Personal Budget Manager

A modern, offline-first personal finance web app. All your data stays on your device — no account, no cloud, no server needed.

## ✨ Features

| Feature | Details |
|---|---|
| 📊 Dashboard | Income, expenses, balance, charts, smart insights |
| 💸 Transactions | Add income & expenses, attach receipts, filter by month/category |
| 📋 Budgets | Monthly category limits + 50/30/20 rule breakdown |
| 🎯 Savings Goals | Target date, progress bar, contribution history |
| 🛡️ Emergency Fund | 3–6 month target, months-covered metric |
| 💳 Debts | Payment history, payoff estimate, progress bar |
| 🔄 Recurring | Daily/weekly/monthly/yearly expenses tracker |
| 🔔 Reminders | Overdue/today/upcoming financial reminders |
| 📈 Reports | Charts, top categories, export to Excel & PDF |
| ⚙️ Settings | Currency, exchange rates, backup/restore, custom categories |

## 🚀 Running Locally

**Prerequisites:** Node.js 18+ ([download](https://nodejs.org))

```bash
# 1. Navigate to the project folder
cd personal-budget-manager

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev

# 4. Open your browser at http://localhost:3000
```

Data is stored in **IndexedDB** (your browser's built-in database). It persists after page refresh and works offline after the first load.

## 🏗️ Building for Production

```bash
npm run build
npm start
```

## 🌐 Deploying to Vercel (Recommended)

Vercel is the easiest way to deploy — free, and takes 2 minutes.

### Option A: Vercel CLI
```bash
npm install -g vercel
vercel
```

### Option B: GitHub + Vercel
1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. Click **Deploy** — done!

> **Note:** This app uses IndexedDB, so data is local to each browser. Deploying lets you access the app from any device, but each device's data is separate unless you use the JSON backup/restore feature in Settings.

## 📁 Project Structure

```
src/
├── app/                    # Next.js pages (App Router)
│   ├── page.tsx            # Dashboard
│   ├── transactions/       # Income & expense transactions
│   ├── budgets/            # Monthly budgets + 50/30/20
│   ├── savings/            # Savings goals
│   ├── emergency-fund/     # Emergency fund tracker
│   ├── debts/              # Debt tracking
│   ├── recurring/          # Recurring expenses
│   ├── reminders/          # Reminders
│   ├── reports/            # Charts + export
│   └── settings/           # App configuration
├── components/
│   ├── layout/             # Sidebar, BottomNav, Header
│   └── ui/                 # Reusable UI components
├── hooks/
│   └── useDb.ts            # All IndexedDB data hooks
└── lib/
    ├── db.ts               # Dexie.js database (IndexedDB)
    ├── types.ts            # TypeScript interfaces
    ├── constants.ts        # Default categories, currencies
    ├── utils.ts            # Helper functions
    ├── insights.ts         # Rule-based smart insights
    └── export.ts           # Excel + PDF export utilities
```

## 🛠️ Tech Stack

- **Next.js 16** (App Router) · **TypeScript** · **Tailwind CSS**
- **Dexie.js** — IndexedDB (local browser storage)
- **Recharts** — charts · **React Hook Form + Zod** — forms
- **date-fns** — dates · **xlsx** — Excel · **jsPDF** — PDF

## 💾 Your Data & Privacy

- Stored **only** in your browser's IndexedDB
- Never sent to any server
- Export a JSON backup anytime: **Settings → Backup → Download Backup**
- Restore on a new device by importing the backup file

## 📱 Mobile & PWA

The app is fully responsive. Install it as a PWA:
- **Android Chrome:** tap menu → "Add to Home Screen"
- **iOS Safari:** tap Share → "Add to Home Screen"
