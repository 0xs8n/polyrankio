const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Check if trader already exists
    const existingTrader = await prisma.trader.findUnique({
      where: { walletAddress: '0x60A4C4b1E76DA34501932Dd01cCEDdf477ca5214' }
    });

    if (existingTrader) {
      console.log('Trader already exists:', existingTrader);
      return;
    }

    // Create new trader
    const trader = await prisma.trader.create({
      data: {
        walletAddress: '0x60A4C4b1E76DA34501932Dd01cCEDdf477ca5214',
        name: 's8n',
        xProfile: '@s8n',
        avatar: 'https://pbs.twimg.com/profile_images/1960416148589006848/_3sigZVS_400x400.jpg',
      }
    });

    // Create initial P&L snapshot
    const snapshot = await prisma.pnLSnapshot.create({
      data: {
        traderId: trader.id,
        dailyPnL: 0,
        weeklyPnL: 0,
        monthlyPnL: 0,
      }
    });

    console.log('Created trader:', trader);
    console.log('Created initial snapshot:', snapshot);
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());