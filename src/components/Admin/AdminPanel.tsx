// src/components/Admin/AdminPanel.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';

interface Trader {
  id: string;
  walletAddress: string;
  name: string;
  xProfile?: string;
  profilePicture?: string;
  currentPnL: {
    dailyPnL: number;
    weeklyPnL: number;
    monthlyPnL: number;
  };
}

interface AdminPanelProps {
  onAddTrader: (trader: Omit<Trader, 'id' | 'currentPnL'>) => void;
  onRemoveTrader: (id: string) => void;
  traders: Trader[];
}

export default function AdminPanel({ onAddTrader, onRemoveTrader, traders }: AdminPanelProps) {
  const [formData, setFormData] = useState({
    name: '',
    walletAddress: '',
    xProfile: '',
    profilePicture: ''
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.walletAddress) {
      alert('Name and wallet address are required');
      return;
    }

    // Validate wallet address format
    if (!formData.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('Please enter a valid Ethereum wallet address');
      return;
    }

    let profilePictureUrl = '';
    
    // In a real app, you'd upload the image to a cloud service like Cloudinary, AWS S3, etc.
    // For now, we'll use the preview URL or a placeholder
    if (profileImage && profileImagePreview) {
      profilePictureUrl = profileImagePreview;
    }

    const newTrader = {
      name: formData.name.trim(),
      walletAddress: formData.walletAddress.trim(),
      xProfile: formData.xProfile.trim() || undefined,
      profilePicture: profilePictureUrl || undefined
    };

    onAddTrader(newTrader);

    // Reset form
    setFormData({
      name: '',
      walletAddress: '',
      xProfile: '',
      profilePicture: ''
    });
    setProfileImage(null);
    setProfileImagePreview('');
    
    // Reset file input
    const fileInput = document.getElementById('profilePicture') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleRemove = (trader: Trader) => {
    if (confirm(`Are you sure you want to remove ${trader.name} from the leaderboard?`)) {
      onRemoveTrader(trader.id);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Add New Trader Form */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Add New Trader</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Picture
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {profileImagePreview ? (
                    <img
                      src={profileImagePreview}
                      alt="Preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center border-2 border-gray-300">
                      <span className="text-gray-400 text-sm">No image</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    id="profilePicture"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                </div>
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., Alex Chen"
              />
            </div>

            {/* Wallet Address */}
            <div>
              <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700 mb-2">
                Wallet Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="walletAddress"
                name="walletAddress"
                value={formData.walletAddress}
                onChange={handleInputChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                placeholder="0x1234567890123456789012345678901234567890"
              />
            </div>

            {/* Twitter Account */}
            <div>
              <label htmlFor="xProfile" className="block text-sm font-medium text-gray-700 mb-2">
                Twitter Account
              </label>
              <input
                type="text"
                id="xProfile"
                name="xProfile"
                value={formData.xProfile}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="@username (optional)"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Add Trader to Leaderboard
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Manage Existing Traders */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Manage Traders ({traders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {traders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No traders added yet</p>
            ) : (
              traders.map((trader) => (
                <div key={trader.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {trader.profilePicture ? (
                      <img
                        src={trader.profilePicture}
                        alt={trader.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-500 text-sm font-medium">
                          {trader.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{trader.name}</p>
                      <p className="text-sm text-gray-500 font-mono">
                        {trader.walletAddress.slice(0, 10)}...
                      </p>
                      {trader.xProfile && (
                        <p className="text-sm text-blue-600">{trader.xProfile}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(trader)}
                    className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-sm hover:bg-red-200 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
