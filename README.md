<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Deployed-Vercel-000?logo=vercel" alt="Vercel" />
</p>

# 📋 Damanhour National University — Exam Observers Distribution System

> A comprehensive web system for managing and automatically distributing observers to examination committees at Damanhour National University (DNU).

🔗 **[exam-schedule-phi.vercel.app](https://exam-schedule-phi.vercel.app)**

---

## ✨ Features

### 👥 Employee Management
- Add, edit, and delete employee records (Name, Department, Phone, Role).
- Bulk import employees from Excel files.
- Quick search functionality by name or department.

### 🏛️ Committee Management
- Create examination committees specifying date, time, location, and college.
- **Smart Period Classification**: Automatically categorizes committees into Morning or Evening sessions based on configurable time ranges.
- Bulk import committees from Excel files and export existing ones.

### 🤖 Intelligent Auto-Distribution
- Automatically assign observers to committees using two algorithms:
  - **Sequential**: Evenly and regularly distributes observers.
  - **Random**: Randomly assigns observers while strictly preventing duplicate assignments.
- Built-in conflict resolution to ensure no overlapping assignments.
- Configurable backup/reserve observer counts per period (Morning/Evening) per day.

### 🛡️ Reserve System
- Assign backup/reserve employees based on specific days and periods (Morning/Evening).
- **Smart Filtering**: Automatically excludes employees who are already assigned to a committee or another reserve slot during the same period.
- Reserves are prominently displayed within the distribution schedule.

### 📊 Advanced Schedule Views
- **By Employee**: View the schedule grouped by individual employees and their assigned committees.
- **By Schedule**: A chronological view showing committees grouped by date with their assigned observers and reserves.

### 📥 Import & Export Capabilities
- **Excel Import**: Quickly populate the database with employees and committees from Excel sheets.
- **Excel Export**: Export individual or collective employee schedules to tabular Excel files.
- **Word Export**: Generate professional Word document schedules complete with the University logo.

### 🌐 Full Bilingual & RTL Support
- Complete bilingual interface (Arabic / English) with instant switching.
- Native Right-to-Left (RTL) layout support for Arabic text.

---

## 🛠️ Technology Stack

| Technology | Description |
|---------|-------|
| **Next.js 14** | React Framework for the frontend UI. |
| **TypeScript** | Strongly typed programming language. |
| **Tailwind CSS** | Utility-first CSS framework for rapid styling. |
| **Supabase** | Cloud open-source PostgreSQL database. |
| **Vercel** | Hosting and automated deployment. |
| **SheetJS (xlsx)** | Powerful library for reading and writing Excel files. |
| **docx** | Microsoft Word document generation. |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                # Home / Dashboard
│   ├── employees/page.tsx      # Employees Management
│   ├── committees/page.tsx     # Committees Management
│   └── assignments/page.tsx    # Distribution & Schedules
├── components/
│   ├── Navbar.tsx              # Navigation & Lang Switcher
│   ├── Footer.tsx              # Page Footer
│   └── EmployeeScheduleCard.tsx# Individual Schedule Component
└── lib/
    ├── supabase.ts             # Supabase Client & Types
    ├── utils.ts                # Date/Time Format Utils
    ├── distribute.ts           # Auto-Distribution Algorithms
    ├── export.ts               # Excel & Word Export Logic
    └── i18n.tsx                # Internationalization System
```

---

## 🚀 Installation & Setup

### 1️⃣ Supabase Setup

1. Create a new project on [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and execute the contents of `supabase-schema.sql`.
3. From **Project Settings → API**, copy your:
   - `Project URL`
   - `anon public key`

### 2️⃣ Local Development

```bash
# Install dependencies
npm install

# Create local environment config
cp .env.local.example .env.local
```

Add your Supabase credentials to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

```bash
# Start the development server
npm run dev
```

### 3️⃣ Vercel Deployment

1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) → **New Project** → Select your repository.
3. Add the following **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy** ✅

---

## 👩‍💻 Developer

**Eng. Alaa Molouk**

---

<p align="center">
  🏫 Damanhour National University (DNU) — Exam Observers Distribution System
</p>
