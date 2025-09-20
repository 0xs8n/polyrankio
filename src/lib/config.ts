// src/lib/config.ts
export const config = {
  admin: {
    secretKey: process.env.ADMIN_PASSWORD || 'fallback-password'
  },
  database: {
    url: process.env.DATABASE_URL
  },
  polymarket: {
    clobUrl: process.env.POLYMARKET_CLOB_URL || 'https://clob.polymarket.com'
  },
  auth: {
    nextAuthSecret: process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000'
  },
  apis: {
    coinGeckoUrl: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3'
  },
  environment: process.env.NODE_ENV || 'development'
};