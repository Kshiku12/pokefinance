# ⚡ PokéFinance — Gamified Personal Finance Tracker

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![Three.js](https://img.shields.io/badge/Three.js-R3F-black?style=for-the-badge&logo=three.js)
![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript)

**Level up your savings. Train your companions. Master your finances.**

[Features](#-key-features) • [Tech Stack](#-tech-stack) • [Route 1 3D World](#-route-1-interactive-3d-world) • [Getting Started](#-getting-started) • [Database Schema](#-database-schema)

</div>

---

## 📖 Overview

**PokéFinance** transforms personal financial management into an immersive RPG journey. Every expense you log, budget you keep, or milestone you achieve grants experience points (EXP) to your Pokémon companions. Watch them evolve from stage 1 starters into mighty champions across 12 finance categories, interact with them in a 3D Route 1 ecosystem (*Pokémon Sleep* / *Legends: Z-A* aesthetics), and unlock Gym Badges as your financial discipline grows.

---

## 🌟 Key Features

### 🎮 Gamified Finance & RPG Progression
- **Expense-to-EXP Engine**: Log transactions categorized across 12+ real-world habits (Food Delivery, Groceries, UPI, Subscriptions, E-Commerce, etc.).
- **Automatic Evolutions**: Companions evolve dynamically at level thresholds (e.g., Charmander $\rightarrow$ Charmeleon $\rightarrow$ Charizard) using Pokémon Medium-Fast growth rate calculations ($EXP = n^3$).
- **Gym Badges & Achievements**: 8 canonical gym badges unlocked by hitting savings streaks, low-spend challenges, and Pokédex completion.
- **PokéDex Companion Catalog**: Comprehensive Pokédex tracking stage, typing, base stats, total spent per category, and evolution trees.

### 🌲 Route 1 Interactive 3D World (Three.js & React Three Fiber)
- **Pokémon Sleep Sanctuary**: Central circular sleep sanctuary featuring sleeping Snorlax with rhythmic breathing and floating "Zzz" VFX.
- **Azure Lake Sanctuary**: Lakeside habitat with swimming physics, paddle locomotion, and dynamic water ripple VFX for water-type Pokémon.
- **Reactive Tall Grass**: Dynamic procedural grass deflection system—grass blades rustle and bend outward when Pokémon walk through them.
- **Authentic Visual VFX**: Anime tail flames, fireflies, drifting atmospheric clouds, and day/night mode transitions.
- **Full Camera Freedom**: 360° orbit controls, fluid zoom, and instant perspective presets (Sleep View, Drone View, and Reset).
- **Canonical Proportions**: Scaled accurately using official Game Freak Pokédex height dimensions.

### 📊 Modern Financial Analytics
- **Interactive Dashboards**: Monthly spending breakdowns, category distribution donut charts, and spending trend lines built with Recharts.
- **Live Supabase Sync**: Real-time transaction persistence with optimistic UI updates and instant balance calculations.
- **Secure Authentication**: Supabase SSR Auth supporting email/password and Google OAuth.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (Turbopack, App Router), React 19, TypeScript
- **3D Graphics & Animation**: Three.js, `@react-three/fiber`, `@react-three/drei`, GSAP, Framer Motion
- **Backend & Database**: Supabase (PostgreSQL, Realtime Subscriptions, Row Level Security)
- **Styling**: Tailwind CSS, Lucide React icons, Canvas 2D effects
- **Audio & Sound**: Web Audio API retro chiptune SFX engine

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.17+ or v20+)
- npm / yarn / pnpm

### 1. Clone the Repository
```bash
git clone https://github.com/Kshiku12/pokefinance.git
cd pokefinance
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory (refer to `.env.example`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_POKEAPI_URL=https://pokeapi.co/api/v2
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📁 Project Architecture

```
pokefinance/
├── public/
│   ├── models/            # 40+ 3D GLTF/GLB Pokémon models
│   └── draco/             # Draco mesh compression decoders
├── src/
│   ├── app/
│   │   ├── dashboard/     # Financial analytics & charts
│   │   ├── world/         # Route 1 3D interactive sanctuary
│   │   ├── pokedex/       # Pokémon companion stats & evolutions
│   │   ├── badges/        # Gym badges & achievement milestones
│   │   ├── add-transaction/ # Fast expense logging interface
│   │   └── settings/      # Currency, budget limits, data export
│   ├── components/
│   │   ├── Pokemon3D.tsx  # Dynamic 3D model loader with custom VFX
│   │   └── AppNavigation.tsx # Glassmorphic dock navigation
│   └── lib/
│       ├── pokemon.ts     # Pokedex data, XP formulas, and categories
│       ├── data-store.ts  # Supabase client & state synchronization
│       └── sound.ts       # 8-bit chiptune sound generator
└── supabase/
    └── migrations/        # PostgreSQL schemas and RLS policies
```

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
