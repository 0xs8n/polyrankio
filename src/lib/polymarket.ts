// src/lib/polymarket.ts
export interface PnLData {
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  totalPnL: number;
  totalVolume: number;
  tradeCount: number;
  winRate: number;
  avgTradeSize: number;
  unrealizedPnL: number;
  realizedPnL: number;
  calculatedAt: string; // UTC timestamp when P&L was calculated
}

export interface UserActivity {
  proxyWallet: string;
  timestamp: number;
  type: string;
  side: string;
  size: number;
  usdcSize: number;
  price: number;
  title: string;
  outcome: string;
  conditionId: string;
  outcomeIndex: number;
}

interface Position {
  conditionId: string;
  outcomeIndex: number;
  shares: number;
  costBasis: number;
  avgPrice: number;
}

interface Trade {
  timestamp: number;
  side: string;
  size: number;
  price: number;
  usdcSize: number;
  conditionId: string;
  outcomeIndex: number;
}

export class PolymarketClient {
  private baseUrl = 'https://data-api.polymarket.com';
  private rateLimitDelay = 1000;

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async makeRequest(url: string) {
    await this.delay(this.rateLimitDelay);
    
    try {
      const res = await fetch(url, { 
        headers: { 
          Accept: 'application/json'
        } 
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  private async fetchAllActivity(walletAddress: string): Promise<UserActivity[]> {
    let allActivities: UserActivity[] = [];
    let offset = 0;
    const limit = 500;
    let totalFetched = 0;

    while (true) {
      const url = `${this.baseUrl}/activity?user=${walletAddress}&limit=${limit}&offset=${offset}`;
      const data = await this.makeRequest(url);
      
      if (!Array.isArray(data) || data.length === 0) {
        break;
      }
      
      const activities = data.map((item: any) => ({
        proxyWallet: item.proxyWallet || '',
        timestamp: parseInt(item.timestamp) || 0,
        type: item.type || '',
        side: item.side || '',
        size: parseFloat(item.size) || 0,
        usdcSize: parseFloat(item.usdcSize) || 0,
        price: parseFloat(item.price) || 0,
        title: item.title || '',
        outcome: item.outcome || '',
        conditionId: item.conditionId || '',
        outcomeIndex: parseInt(item.outcomeIndex) || 0,
      }));
      
      allActivities = allActivities.concat(activities);
      totalFetched += activities.length;
      
      if (data.length < limit) {
        break;
      }
      
      offset += limit;
      
      if (totalFetched > 5000) {
        break;
      }
    }

    return allActivities;
  }

  private calculateRealizedPnL(activities: UserActivity[]) {
    // Use UTC timestamps for consistent time calculations across all users
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - (24 * 60 * 60);
    const oneWeekAgo = now - (7 * 24 * 60 * 60);
    const oneMonthAgo = now - (30 * 24 * 60 * 60);

    // Group trades by position (conditionId + outcomeIndex)
    const positionTrades = new Map<string, Trade[]>();
    const realizedPnLByTime = {
      daily: 0,
      weekly: 0,
      monthly: 0,
      total: 0
    };

    // Group all trades by position
    for (const activity of activities) {
      if (activity.type === 'TRADE' && activity.conditionId) {
        const positionKey = `${activity.conditionId}-${activity.outcomeIndex}`;
        
        if (!positionTrades.has(positionKey)) {
          positionTrades.set(positionKey, []);
        }
        
        positionTrades.get(positionKey)!.push({
          timestamp: activity.timestamp,
          side: activity.side,
          size: activity.size,
          price: activity.price,
          usdcSize: activity.usdcSize,
          conditionId: activity.conditionId,
          outcomeIndex: activity.outcomeIndex,
        });
      }
    }

    // Calculate realized P&L for each position using FIFO
    for (const [positionKey, trades] of positionTrades.entries()) {
      // Sort trades by timestamp (oldest first)
      trades.sort((a, b) => a.timestamp - b.timestamp);
      
      const buyQueue: Array<{size: number, price: number, timestamp: number}> = [];
      let positionRealizedPnL = 0;

      for (const trade of trades) {
        if (trade.side === 'BUY') {
          // Add to buy queue
          buyQueue.push({
            size: trade.size,
            price: trade.price,
            timestamp: trade.timestamp
          });
        } else if (trade.side === 'SELL') {
          // Match against buy queue (FIFO)
          let remainingToSell = trade.size;
          const sellPrice = trade.price;
          
          while (remainingToSell > 0 && buyQueue.length > 0) {
            const oldestBuy = buyQueue[0];
            const sharesMatched = Math.min(remainingToSell, oldestBuy.size);
            
            // Calculate realized P&L for this matched portion
            const realizedGainLoss = (sellPrice - oldestBuy.price) * sharesMatched;
            positionRealizedPnL += realizedGainLoss;
            
            // Determine which timeframe this realization belongs to (based on sell timestamp)
            if (trade.timestamp >= oneDayAgo) {
              realizedPnLByTime.daily += realizedGainLoss;
            }
            if (trade.timestamp >= oneWeekAgo) {
              realizedPnLByTime.weekly += realizedGainLoss;
            }
            if (trade.timestamp >= oneMonthAgo) {
              realizedPnLByTime.monthly += realizedGainLoss;
            }
            realizedPnLByTime.total += realizedGainLoss;
            
            // Update remaining quantities
            remainingToSell -= sharesMatched;
            oldestBuy.size -= sharesMatched;
            
            // Remove depleted buy order
            if (oldestBuy.size <= 0) {
              buyQueue.shift();
            }
          }
        }
      }
    }

    return {
      dailyPnL: realizedPnLByTime.daily,
      weeklyPnL: realizedPnLByTime.weekly,
      monthlyPnL: realizedPnLByTime.monthly,
      totalPnL: realizedPnLByTime.total,
    };
  }

  private calculateMetrics(activities: UserActivity[]) {
    const trades = activities.filter(a => a.type === 'TRADE');
    
    if (trades.length === 0) {
      return { 
        totalVolume: 0, 
        tradeCount: 0, 
        winRate: 0, 
        avgTradeSize: 0 
      };
    }

    const totalVolume = trades.reduce((sum, t) => sum + t.usdcSize, 0);
    const avgTradeSize = totalVolume / trades.length;

    // Calculate win rate based on realized trades
    const sellTrades = trades.filter(t => t.side === 'SELL');
    let winRate = 0;
    
    if (sellTrades.length > 0) {
      // Simple approximation: profitable if sell price > 0.6
      const profitableSells = sellTrades.filter(t => t.price > 0.6).length;
      winRate = (profitableSells / sellTrades.length) * 100;
    }

    return { 
      totalVolume, 
      tradeCount: trades.length, 
      winRate, 
      avgTradeSize 
    };
  }

  async getUserData(walletAddress: string): Promise<PnLData> {
    try {
      const activities = await this.fetchAllActivity(walletAddress);
      
      if (activities.length === 0) {
        return {
          dailyPnL: 0,
          weeklyPnL: 0,
          monthlyPnL: 0,
          totalPnL: 0,
          totalVolume: 0,
          tradeCount: 0,
          winRate: 0,
          avgTradeSize: 0,
          unrealizedPnL: 0,
          realizedPnL: 0,
          calculatedAt: new Date().toISOString(),
        };
      }
      
      const realizedPnLData = this.calculateRealizedPnL(activities);
      const metrics = this.calculateMetrics(activities);
      
      const result = {
        ...realizedPnLData,
        ...metrics,
        unrealizedPnL: 0, // Would need current market prices to calculate
        realizedPnL: realizedPnLData.totalPnL,
        calculatedAt: new Date().toISOString(), // UTC timestamp
      };
      
      return result;
      
    } catch (error) {
      throw new Error(`Failed to fetch P&L data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isValidWalletAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

export const polymarketClient = new PolymarketClient();