// src/app/api/traders/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, Trader, PnLSnapshot } from '@prisma/client';

const prisma = new PrismaClient();

// Type definitions
interface TraderWithSnapshots extends Trader {
  pnlSnapshots: PnLSnapshot[];
}

interface TraderUpdate {
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
  calculatedAt?: string; // UTC timestamp when P&L was calculated
}

interface CreateTraderRequest {
  walletAddress: string;
  name: string;
  xProfile?: string;
  avatar?: string;
}

export async function GET() {
  try {
    const traders = await prisma.trader.findMany({
      include: {
        pnlSnapshots: {
          orderBy: { timestamp: 'desc' },
          take: 1 // Get most recent snapshot
        }
      },
      where: { isActive: true }
    });

    // Transform data to match your frontend format
    const formattedTraders = traders.map((trader: TraderWithSnapshots) => ({
      id: trader.id,
      walletAddress: trader.walletAddress,
      name: trader.name,
      xProfile: trader.xProfile,
      profilePicture: trader.avatar,
      isActive: trader.isActive,
      currentPnL: {
        dailyPnL: trader.pnlSnapshots[0]?.dailyPnL || 0,
        weeklyPnL: trader.pnlSnapshots[0]?.weeklyPnL || 0,
        monthlyPnL: trader.pnlSnapshots[0]?.monthlyPnL || 0,
      },
      totalVolume: 0, // You can add this to schema later
      tradeCount: 0,  // You can add this to schema later
      winRate: 0,     // You can add this to schema later
      lastUpdated: trader.pnlSnapshots[0]?.timestamp || trader.updatedAt,
      calculatedAt: trader.pnlSnapshots[0]?.timestamp?.toISOString() || trader.updatedAt.toISOString(),
    }));

    return NextResponse.json(formattedTraders);
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fetch traders', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: CreateTraderRequest = await request.json();
    const { walletAddress, name, xProfile, avatar } = body;
    
    // Check if trader already exists
    const existingTrader = await prisma.trader.findUnique({
      where: { walletAddress }
    });

    if (existingTrader) {
      return NextResponse.json({ error: 'Trader already exists' }, { status: 400 });
    }
    
    const trader = await prisma.trader.create({
      data: {
        walletAddress,
        name,
        xProfile: xProfile || null,
        avatar: avatar || '',
      }
    });

    // Create initial P&L snapshot with UTC timestamp
    await prisma.pnLSnapshot.create({
      data: {
        traderId: trader.id,
        dailyPnL: 0,
        weeklyPnL: 0,
        monthlyPnL: 0,
        timestamp: new Date(), // This will be stored as UTC in the database
      }
    });

    return NextResponse.json(trader);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create trader' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const traders: TraderUpdate[] = await request.json();
    
    // Update P&L snapshots for each trader
    for (const trader of traders) {
      // Create new snapshot with updated P&L data and UTC timestamp
      await prisma.pnLSnapshot.create({
        data: {
          traderId: trader.id,
          dailyPnL: trader.currentPnL.dailyPnL,
          weeklyPnL: trader.currentPnL.weeklyPnL,
          monthlyPnL: trader.currentPnL.monthlyPnL,
          timestamp: new Date(), // UTC timestamp when this calculation was performed
        }
      });

      // Update trader's updated timestamp
      await prisma.trader.update({
        where: { id: trader.id },
        data: { 
          updatedAt: new Date() // UTC timestamp
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Updated ${traders.length} traders`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update traders' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const traderId = searchParams.get('id');

    if (!traderId) {
      return NextResponse.json({ error: 'Trader ID required' }, { status: 400 });
    }

    // Soft delete - set isActive to false
    await prisma.trader.update({
      where: { id: traderId },
      data: { 
        isActive: false,
        updatedAt: new Date() // UTC timestamp
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete trader' }, { status: 500 });
  }
}

// Optional: Add endpoint to get P&L history for a trader
export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const traderId = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '30');

    if (!traderId) {
      return NextResponse.json({ error: 'Trader ID required' }, { status: 400 });
    }

    const snapshots = await prisma.pnLSnapshot.findMany({
      where: { traderId },
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    return NextResponse.json({
      traderId,
      snapshots: snapshots.map(s => ({
        ...s,
        timestamp: s.timestamp.toISOString() // Ensure UTC format
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch P&L history' }, { status: 500 });
  }
}