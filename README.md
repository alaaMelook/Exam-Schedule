# Exam Observers Distribution System 📋

A comprehensive web system for managing and distributing observers to examination committees.

---

## Installation & Deployment

### 1️⃣ Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Open the **SQL Editor** and run the contents of the `supabase-schema.sql` file.
3. From **Project Settings → API**, copy:
   - `Project URL`
   - `anon public` key

### 2️⃣ Local Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
```

Open `.env.local` and add the Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

```bash
# Run the project locally
npm run dev
```

### 3️⃣ Deployment to Vercel

1. Push your project to GitHub.
2. Open [vercel.com](https://vercel.com) → **New Project** → Select the repo.
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy** ✅

---

## Features

| Feature | Description |
|---------|-------------|
| 👥 Employee Management | Add, edit, and delete employees. |
| 🏛️ Committee Management | Add committees with days, times, and number of observers. |
| 🤖 Automatic Distribution | Distribute sequentially or randomly while avoiding conflicts. |
| ✏️ Manual Editing | Manually add or modify assignments. |
| 📊 Dual View | View by employee or by schedule/time. |
| 📄 PDF Export | Export each employee's schedule as a PDF. |
| 📑 Excel Export | Export a single employee's or all employees' schedules to Excel. |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home Page
│   ├── employees/page.tsx    # Employee Management
│   ├── committees/page.tsx   # Committee Management
│   └── assignments/page.tsx  # Distribution and Schedules
├── components/
│   ├── Navbar.tsx            # Navigation Bar
│   └── EmployeeScheduleCard.tsx  # Employee Schedule Card
└── lib/
    ├── supabase.ts           # Supabase Client and Types
    ├── utils.ts              # Date & Time Utilities
    ├── distribute.ts         # Automatic Distribution Logic
    └── export.ts             # PDF & Excel Export Options
```
