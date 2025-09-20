// src/types/index.ts

export interface Trader {
  id: string;
  walletAddress: string;
  name: string;
  xProfile?: string;
  avatar: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PnLSnapshot {
  id: string;
  traderId: string;
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  timestamp: Date;
}

export interface TraderWithPnL extends Trader {
  currentPnL: {
    dailyPnL: number;
    weeklyPnL: number;
    monthlyPnL: number;
  };
}

export interface POLPrice {
  price: number;
  change24h: number;
  lastUpdated: Date;
}

export type TimeFilter = 'daily' | 'weekly' | 'monthly';

export interface AddTraderRequest {
  walletAddress: string;
  name: string;
  xProfile?: string;
  avatar: string;
}

export interface PolymarketPosition {
  id: string;
  tokenId: string;
  marketId: string;
  conditionId: string;
  quantity: string;
  value: string;
  pnl: string;
  percentagePnl: string;
}

export interface PolymarketActivity {
  id: string;
  type: 'trade' | 'redeem' | 'split' | 'merge';
  timestamp: string;
  tokenAmount: string;
  cashAmount: string;
  marketId: string;
  outcomeIndex: number;
}