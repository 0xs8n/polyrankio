# Polyrank

A real-time Polymarket prediction market leaderboard built with Next.js and TypeScript.

## Overview

Polyrank tracks the performance of top Polymarket traders by fetching live data from Polymarket's API to calculate daily, weekly, and monthly P&L. The application features a dark, minimalistic UI with a blue theme and provides comprehensive trading metrics including wallet addresses, trading volume, win rates, and profit/loss data.

## Features

- **Real-time Data**: Fetches live trader data from Polymarket's API
- **Performance Tracking**: Daily, weekly, and monthly P&L calculations
- **Trading Metrics**: Volume, trade count, and win rate tracking
- **Admin Panel**: Secret admin interface for managing traders
- **POL Price Integration**: Live POL token price ticker
- **Responsive Design**: Mobile-first design with smooth animations
- **Dark Theme**: Professional dark UI with blue accent colors

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **API**: Polymarket Data API integration
- **Fonts**: Geist Sans and Geist Mono

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd polymarket-hall-of-fame
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Add your database URL and any required API keys to `.env.local`.

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── admin/         # Admin authentication
│   │   ├── pol-price/     # POL price data
│   │   └── traders/       # Trader management
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── Admin/            # Admin panel components
│   └── ui/               # Reusable UI components
├── lib/                  # Utility libraries
│   ├── db.ts            # Database connection
│   └── polymarket.ts    # Polymarket API client
└── types/               # TypeScript type definitions
    └── index.ts
```

## API Endpoints

- `GET /api/traders` - Fetch all traders
- `POST /api/traders` - Add new trader
- `DELETE /api/traders/[id]` - Remove trader
- `GET /api/pol-price` - Get POL token price
- `POST /api/admin/login` - Admin authentication

## Admin Panel

Access the admin panel at `/admin-secret-panel` to:
- Add new traders to the leaderboard
- Remove existing traders
- Manage trader information

## Database Schema

The application uses PostgreSQL with the following main models:

- **Trader**: Stores trader information (wallet, name, profile)
- **PnLSnapshot**: Historical P&L data for performance tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue in the repository.
