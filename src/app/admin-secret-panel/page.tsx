'use client';

import React, { useState, useEffect } from 'react';

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
}

// Simple wallet address validation
const isValidWalletAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export default function SecretAdminPage() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTraders, setIsLoadingTraders] = useState(false);
  
  // Add trader form state
  const [newTrader, setNewTrader] = useState({
    name: '',
    walletAddress: '',
    xProfile: '',
    profilePicture: ''
  });

  // Check if user is already authenticated
  useEffect(() => {
    const token = localStorage.getItem('admin-token');
    if (token && token.startsWith('admin-authenticated-')) {
      // Check if token is recent (24 hours)
      const timestamp = parseInt(token.split('-')[2]);
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      if (now - timestamp < twentyFourHours) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('admin-token');
      }
    }
  }, []);

  // Load traders from database when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchTradersFromAPI();
    }
  }, [isAuthenticated]);

  // Fetch traders from database
  const fetchTradersFromAPI = async () => {
    setIsLoadingTraders(true);
    try {
      const response = await fetch('/api/traders');
      if (!response.ok) throw new Error('Failed to fetch traders');
      
      const tradersData = await response.json();
      const tradersWithDates = tradersData.map((trader: any) => ({
        ...trader,
        lastUpdated: new Date(trader.lastUpdated),
      }));
      setTraders(tradersWithDates);
    } catch (error) {
      console.error('Error fetching traders:', error);
      setError('Failed to load traders from database');
    } finally {
      setIsLoadingTraders(false);
    }
  };

  // Add trader to database
  const addTraderToAPI = async (trader: {
    walletAddress: string;
    name: string;
    xProfile?: string;
    avatar?: string;
  }) => {
    try {
      const response = await fetch('/api/traders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trader),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add trader');
      }

      const newTrader = await response.json();
      return newTrader;
    } catch (error) {
      throw error;
    }
  };

  // Remove trader from database
  const removeTraderFromAPI = async (traderId: string) => {
    try {
      const response = await fetch(`/api/traders?id=${traderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove trader');
      }

      return true;
    } catch (error) {
      throw error;
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setIsAuthenticated(true);
        // Create a simple token since your API doesn't return one
        const token = 'admin-authenticated-' + Date.now();
        localStorage.setItem('admin-token', token);
        setPassword(''); // Clear password from memory
      } else {
        setError(data.message || 'Invalid password');
      }
    } catch (error) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin-token');
    setPassword('');
  };

  const handleAddTrader = async () => {
    if (!newTrader.name || !newTrader.walletAddress) {
      setError('Name and wallet address are required');
      return;
    }

    if (!isValidWalletAddress(newTrader.walletAddress)) {
      setError('Invalid wallet address format. Please use a valid Ethereum address.');
      return;
    }

    // Check if trader already exists
    const exists = traders.some(t => t.walletAddress.toLowerCase() === newTrader.walletAddress.toLowerCase());
    if (exists) {
      setError('Trader with this wallet address already exists');
      return;
    }

    setIsLoading(true);
    try {
      const traderData = {
        walletAddress: newTrader.walletAddress,
        name: newTrader.name,
        xProfile: newTrader.xProfile || undefined,
        avatar: newTrader.profilePicture || undefined,
      };

      await addTraderToAPI(traderData);
      
      // Refresh traders list from database
      await fetchTradersFromAPI();
      
      setNewTrader({ name: '', walletAddress: '', xProfile: '', profilePicture: '' });
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add trader');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTrader = async (id: string) => {
    if (!confirm('Are you sure you want to remove this trader? This will hide them from the leaderboard.')) {
      return;
    }

    setIsLoading(true);
    try {
      await removeTraderFromAPI(id);
      
      // Refresh traders list from database
      await fetchTradersFromAPI();
      
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove trader');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAllTraders = async () => {
    if (!confirm('Are you sure you want to remove ALL traders? This cannot be undone easily.')) {
      return;
    }

    setIsLoading(true);
    try {
      // Remove all traders one by one
      for (const trader of traders) {
        await removeTraderFromAPI(trader.id);
      }
      
      // Refresh traders list
      await fetchTradersFromAPI();
      
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to clear all traders');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 rounded-xl p-8 shadow-2xl border border-gray-800 w-96">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-blue-400 mb-2">Polyrank Admin</h1>
            <p className="text-gray-400">Secret Administration Panel</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleLogin()}
              disabled={isLoading}
            />
            
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}
            
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              {isLoading ? 'Authenticating...' : 'Access Admin Panel'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Polyrank Admin</h1>
            <p className="text-gray-400">Manage traders and leaderboard</p>
          </div>
          
          <div className="space-x-4">
            <a
              href="/"
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              View Leaderboard
            </a>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {isLoadingTraders && (
          <div className="text-center py-8">
            <div className="text-blue-400">Loading traders from database...</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Trader Form */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-bold text-white mb-4">Add New Trader</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Trader Name *
                </label>
                <input
                  type="text"
                  value={newTrader.name}
                  onChange={(e) => setNewTrader(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., CryptoOracle"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Wallet Address *
                </label>
                <input
                  type="text"
                  value={newTrader.walletAddress}
                  onChange={(e) => setNewTrader(prev => ({ ...prev, walletAddress: e.target.value }))}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="0x..."
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  X/Twitter Profile
                </label>
                <input
                  type="text"
                  value={newTrader.xProfile}
                  onChange={(e) => setNewTrader(prev => ({ ...prev, xProfile: e.target.value }))}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="@username"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Profile Picture URL
                </label>
                <input
                  type="text"
                  value={newTrader.profilePicture}
                  onChange={(e) => setNewTrader(prev => ({ ...prev, profilePicture: e.target.value }))}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://..."
                  disabled={isLoading}
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                onClick={handleAddTrader}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                {isLoading ? 'Adding...' : 'Add Trader'}
              </button>
            </div>
          </div>

          {/* Current Traders List */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                Current Traders ({traders.length})
              </h2>
              <button
                onClick={fetchTradersFromAPI}
                disabled={isLoadingTraders}
                className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                {isLoadingTraders ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {traders.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  {isLoadingTraders ? 'Loading...' : 'No traders in database'}
                </p>
              ) : (
                traders.map((trader) => (
                  <div
                    key={trader.id}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {trader.profilePicture ? (
                          <img
                            src={trader.profilePicture}
                            alt={trader.name}
                            className="w-10 h-10 rounded-full border-2 border-blue-500"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {trader.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-white">{trader.name}</h3>
                          <p className="text-xs text-gray-400 font-mono">
                            {trader.walletAddress.slice(0, 6)}...{trader.walletAddress.slice(-4)}
                          </p>
                          {trader.xProfile && (
                            <p className="text-xs text-blue-400">{trader.xProfile}</p>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleRemoveTrader(trader.id)}
                        disabled={isLoading}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        {isLoading ? '...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {traders.length > 0 && (
          <div className="mt-8 bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-bold text-white mb-4">Bulk Actions</h2>
            <div className="flex space-x-4">
              <button
                onClick={handleClearAllTraders}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isLoading ? 'Removing...' : 'Clear All Traders'}
              </button>
              
              <button
                onClick={() => {
                  const data = JSON.stringify(traders, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `polyrank-traders-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                Export Traders
              </button>
            </div>
          </div>
        )}

        {/* Database Status */}
        <div className="mt-4 text-center text-sm text-gray-500">
          Connected to Supabase database • All changes are permanent
        </div>
      </div>
    </div>
  );
}