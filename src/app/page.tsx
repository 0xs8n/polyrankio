// src/app/page.tsx - POLYRANK DARK DESIGN - FIXED VERSION
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { polymarketClient } from '@/lib/polymarket';

interface Trader {
  id: string;
  walletAddress: string;
  name: string;
  xProfile?: string;
  profilePicture?: string;
  isActive: boolean;
  currentPnL: {
    dailyPnL: number;
    weeklyPnL: number;
    monthlyPnL: number;
  };
  totalVolume?: number;
  tradeCount?: number;
  winRate?: number;
  lastUpdated?: Date | string;
  calculatedAt?: string;
}

// Helper function for date formatting
const formatLastUpdated = (lastUpdated: Date | string | undefined): string => {
  if (!lastUpdated) return 'Never';
  try {
    const date = lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated);
    return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
  } catch (error) {
    return 'Error';
  }
};

export default function HomePage() {
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [traders, setTraders] = useState<Trader[]>([]);
  const [isLoadingTraders, setIsLoadingTraders] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const copiedTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [polPrice, setPolPrice] = useState<{
    price: number;
    change24h: number;
    lastUpdated: string;
  }>({
    price: 0.41,
    change24h: 2.34,
    lastUpdated: new Date().toISOString(),
  });
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  // Fetch POL price
  const fetchPolPrice = useCallback(async () => {
    setIsLoadingPrice(true);
    try {
      const response = await fetch('/api/pol-price');
      if (!response.ok) throw new Error('Failed to fetch POL price');
      const data = await response.json();
      setPolPrice({
        price: data.price || 0.41,
        change24h: data.change24h || 0,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to fetch POL price:', error);
      // Keep default values on error
    } finally {
      setIsLoadingPrice(false);
    }
  }, []);

  // Save traders to API
  const saveTradersToAPI = useCallback(async (updatedTraders: Trader[]) => {
    try {
      const response = await fetch('/api/traders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTraders),
      });
      if (!response.ok) throw new Error('Failed to save traders');
    } catch (error) {
      console.error('Error saving traders:', error);
      setError('Failed to save P&L data to database');
    }
  }, []);

  // Internal function to fetch P&L data with traders passed as parameter
  const fetchRealTraderDataInternal = useCallback(async (currentTraders: Trader[]) => {
    try {
      const walletAddresses = currentTraders.map((t) => t.walletAddress);
      const validAddresses = walletAddresses.filter((addr) =>
        polymarketClient.isValidWalletAddress(addr)
      );

      if (validAddresses.length === 0) {
        throw new Error('No valid wallet addresses found.');
      }

      const updatedTraders = [...currentTraders];

      for (const address of validAddresses) {
        try {
          const pnlData = await polymarketClient.getUserData(address);
          const traderIndex = updatedTraders.findIndex((t) => t.walletAddress === address);

          if (traderIndex !== -1) {
            updatedTraders[traderIndex] = {
              ...updatedTraders[traderIndex],
              currentPnL: {
                dailyPnL: pnlData.dailyPnL,
                weeklyPnL: pnlData.weeklyPnL,
                monthlyPnL: pnlData.monthlyPnL,
              },
              totalVolume: pnlData.totalVolume,
              tradeCount: pnlData.tradeCount,
              winRate: pnlData.winRate,
              lastUpdated: new Date(),
              calculatedAt: pnlData.calculatedAt,
            };
          }
        } catch (traderError) {
          console.error(`Failed to fetch data for ${address}:`, traderError);
        }
      }

      setTraders(updatedTraders);
      await saveTradersToAPI(updatedTraders);
      setLastUpdate(new Date());
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch trader data');
    } finally {
      setIsLoadingTraders(false);
    }
  }, [saveTradersToAPI]);

  // Fetch traders from API and refresh PnL
  const fetchAndRefreshTraders = useCallback(async () => {
    setIsLoadingTraders(true);
    setError(null);
    try {
      const response = await fetch('/api/traders');
      if (!response.ok) throw new Error('Failed to fetch traders');
      const tradersData = await response.json();
      const tradersWithDates = tradersData.map((trader: any) => ({
        ...trader,
        lastUpdated: new Date(trader.lastUpdated),
        calculatedAt: trader.calculatedAt,
      }));
      setTraders(tradersWithDates);

      // Refresh PnL immediately after loading traders
      if (tradersWithDates.length > 0) {
        await fetchRealTraderDataInternal(tradersWithDates);
      }
    } catch (error) {
      console.error('Error fetching traders:', error);
      setError('Failed to load traders from database');
    } finally {
      setIsLoadingTraders(false);
      setIsInitialLoad(false);
    }
  }, [fetchRealTraderDataInternal]);

  // Fetch real trader data (public function for manual refresh)
  const fetchRealTraderData = useCallback(async () => {
    if (traders.length === 0) {
      setError('No traders added yet.');
      return;
    }

    setIsLoadingTraders(true);
    setError(null);
    await fetchRealTraderDataInternal(traders);
  }, [traders, fetchRealTraderDataInternal]);

  const getSortedTraders = useCallback(() => {
    return [...traders].sort((a, b) => {
      const pnlKey = `${timeFilter}PnL` as keyof typeof a.currentPnL;
      return b.currentPnL[pnlKey] - a.currentPnL[pnlKey];
    });
  }, [traders, timeFilter]);

  const formatCurrency = useCallback((amount: number) => {
    const isNegative = amount < 0;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    return isNegative ? `-${formatted}` : `+${formatted}`;
  }, []);

  const getPnLColor = useCallback((amount: number) => {
    return amount >= 0 ? 'text-green-400' : 'text-red-400';
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
    }
    copiedTimeoutRef.current = setTimeout(() => {
      setCopiedAddress(null);
    }, 1500);
  }, []);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  // Poll for POL price every 60 seconds
  useEffect(() => {
    fetchPolPrice();
    const interval = setInterval(fetchPolPrice, 60000);
    return () => clearInterval(interval);
  }, [fetchPolPrice]);

  // Load traders on mount
  useEffect(() => {
    fetchAndRefreshTraders();
  }, [fetchAndRefreshTraders]);

  // Periodic refresh every 15 minutes
  useEffect(() => {
    if (traders.length > 0) {
      const interval = setInterval(fetchAndRefreshTraders, 15 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [fetchAndRefreshTraders, traders.length]);

  // Show loading screen during initial load
  if (isInitialLoad) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl font-semibold">Loading Polyrank...</div>
          <div className="text-gray-400 text-sm mt-2">Fetching trader data</div>
        </div>
      </div>
    );
  }

  const sortedTraders = getSortedTraders();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
        <div
          className="absolute top-40 right-32 w-48 h-48 bg-purple-500/10 rounded-full blur-xl animate-pulse"
          style={{ animationDelay: '2s' }}
        ></div>
        <div
          className="absolute bottom-32 left-1/4 w-40 h-40 bg-indigo-500/10 rounded-full blur-xl animate-pulse"
          style={{ animationDelay: '4s' }}
        ></div>
        <div
          className="absolute bottom-20 right-20 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl animate-pulse"
          style={{ animationDelay: '1s' }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.15) 1px, transparent 0)',
            backgroundSize: '50px 50px',
          }}
        ></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent animate-pulse"></div>
        <div
          className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent animate-pulse"
          style={{ animationDelay: '3s' }}
        ></div>
      </div>

      {/* POL Price Card - Top Right Corner */}
      <div className="absolute top-4 right-4 z-20">
        <a href="https://www.tradingview.com/chart/?symbol=BINANCE%3APOLUSDT.P" target="_blank" rel="noopener noreferrer">
          <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 shadow-lg hover:bg-gray-750 transition-colors cursor-pointer">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <div className="w-5 h-5 bg-purple-300 rounded"></div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">POL</p>
                <div className="flex items-center space-x-1.5">
                  <p className="text-lg font-bold text-white">
                    {isLoadingPrice ? '...' : `$${polPrice.price.toFixed(4)}`}
                  </p>
                  <span
                    className={`text-xs font-medium ${
                      polPrice.change24h >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
                    } px-1.5 py-0.5 rounded-full flex items-center`}
                  >
                    <svg className="w-2 h-2 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d={
                          polPrice.change24h >= 0
                            ? 'M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z'
                            : 'M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z'
                        }
                        clipRule="evenodd"
                      />
                    </svg>
                    {polPrice.change24h >= 0 ? '+' : ''}
                    {polPrice.change24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </a>
      </div>

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-3">Polyrank</h1>
            <p className="text-lg sm:text-xl font-light text-gray-400 tracking-wide mb-4">
              Where prediction bets meet glory
            </p>
            <div className="flex justify-center">
              <div className="w-32 h-px bg-gray-700"></div>
            </div>
            {/* Follow us on Twitter Link */}
            <a
              href="https://x.com/PolyRankio"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center text-gray-400 hover:text-white transition-colors duration-300 text-sm"
            >
              <div className="w-4 h-4 bg-blue-400 rounded mr-2"></div>
              Follow us on Twitter
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Time Filter Buttons */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-xl bg-gray-800/80 p-1.5 backdrop-blur-sm border border-gray-700">
            {(['daily', 'weekly', 'monthly'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-300 ${
                  timeFilter === filter
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Manual Refresh Button for Testing */}
        <div className="flex justify-center mb-4">
          <button
            onClick={fetchRealTraderData}
            disabled={isLoadingTraders}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-4 py-2 rounded-xl transition-colors"
          >
            {isLoadingTraders ? 'Loading...' : 'Refresh P&L Data'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 text-red-400 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Status */}
        {lastUpdate && (
          <div className="text-center text-gray-500 text-sm mb-8">
            P&L data last updated: {formatLastUpdated(lastUpdate)}
          </div>
        )}

        {/* Trader Cards */}
        <div className="space-y-4 max-w-4xl mx-auto">
          {sortedTraders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <svg className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                {isLoadingTraders ? 'Loading Traders...' : 'No Traders Yet'}
              </h3>
              <p className="text-gray-500">
                {isLoadingTraders ? 'Fetching data from database...' : 'Add some traders to get started'}
              </p>
            </div>
          ) : (
            <>
              {sortedTraders.map((trader, index) => (
                <div
                  key={trader.id}
                  className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10"
                  style={{ minHeight: '160px' }}
                >
                  <div className="flex flex-col sm:flex-row items-center sm:items-start sm:justify-between h-full">
                    <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                      {/* Rank Badge */}
                      <div className="relative">
                        {trader.profilePicture ? (
                          <img
                            src={trader.profilePicture}
                            alt={trader.name}
                            className="w-12 h-12 rounded-full border-none"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold">
                            {trader.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 bg-gray-700 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                          {index + 1}
                        </span>
                      </div>

                      {/* Trader Info */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-lg text-white">{trader.name}</h3>
                          {trader.xProfile && (
                            <a
                              href={`https://x.com/${trader.xProfile.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <div className="w-5 h-5 bg-blue-400 rounded"></div>
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => copyToClipboard(trader.walletAddress)}
                          className="text-sm text-gray-400 hover:text-blue-400 font-mono transition-colors cursor-pointer w-32 text-left"
                          title="Click to copy"
                        >
                          {copiedAddress === trader.walletAddress
                            ? 'Copied'
                            : `${trader.walletAddress.slice(0, 6)}...${trader.walletAddress.slice(-4)}`}
                        </button>
                      </div>
                    </div>

                    {/* P&L Display */}
                    <div className="text-center sm:text-right mt-4 sm:mt-0 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">
                          {timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)} PnL
                        </p>
                        <p
                          className={`text-lg font-bold ${getPnLColor(
                            trader.currentPnL[`${timeFilter}PnL` as keyof typeof trader.currentPnL]
                          )}`}
                        >
                          {isLoadingTraders ? (
                            <span className="text-gray-500">Loading...</span>
                          ) : (
                            formatCurrency(trader.currentPnL[`${timeFilter}PnL` as keyof typeof trader.currentPnL])
                          )}
                        </p>
                      </div>

                      {/* Additional Stats */}
                      <div className="flex flex-wrap justify-center sm:justify-end gap-2 mt-2 text-xs text-gray-500">
                        {trader.totalVolume !== undefined && (
                          <span>Vol: {formatCurrency(trader.totalVolume)}</span>
                        )}
                        {trader.tradeCount !== undefined && trader.tradeCount > 0 && (
                          <span>Trades: {trader.tradeCount}</span>
                        )}
                        {trader.winRate !== undefined && trader.winRate > 0 && (
                          <span>Win: {trader.winRate.toFixed(1)}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
