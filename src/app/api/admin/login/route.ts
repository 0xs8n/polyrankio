// src/app/api/admin/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    // Simple password check - in production, use proper authentication
    const validPassword = config.admin.secretKey;
    
    if (password === validPassword) {
      return NextResponse.json({ 
        success: true, 
        message: 'Authentication successful' 
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, message: 'Authentication failed' },
      { status: 500 }
    );
  }
}
