// src/lib/constants.ts

export const APP_CONFIG = {
  name: 'Polyrank',
  description: 'Real-time Polymarket prediction market leaderboard',
  version: '1.0.0',
  author: 'Polyrank Team',
} as const;

export const API_ENDPOINTS = {
  traders: '/api/traders',
  polPrice: '/api/pol-price',
  adminLogin: '/api/admin/login',
} as const;

export const POLYMARKET_CONFIG = {
  baseUrl: 'https://gamma-api.polymarket.com',
  endpoints: {
    positions: '/positions',
    activities: '/activities',
    markets: '/markets',
  },
} as const;

export const TIME_FILTERS = ['daily', 'weekly', 'monthly'] as const;

export const DEFAULT_TRADER_AVATAR = '';

export const CURRENCY_FORMAT = {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
} as const;

export const PNL_COLORS = {
  positive: 'text-green-400',
  negative: 'text-red-400',
} as const;

export const ANIMATION_DELAYS = {
  orb1: '0s',
  orb2: '2s',
  orb3: '4s',
  orb4: '1s',
} as const;
