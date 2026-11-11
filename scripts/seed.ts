
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Hash password for test user
  const hashedPassword = await bcrypt.hash('johndoe123', 10);

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'John Doe',
      password: hashedPassword,
    },
  });

  console.log('Created user:', user.email);

  // Create sample protocols
  const protocols = await Promise.all([
    prisma.protocol.upsert({
      where: { id: 'protocol-1' },
      update: {},
      create: {
        id: 'protocol-1',
        name: 'Morning Meditation',
        userId: user.id,
        isActive: true,
      },
    }),
    prisma.protocol.upsert({
      where: { id: 'protocol-2' },
      update: {},
      create: {
        id: 'protocol-2',
        name: 'Keto Diet',
        userId: user.id,
        isActive: true,
      },
    }),
    prisma.protocol.upsert({
      where: { id: 'protocol-3' },
      update: {},
      create: {
        id: 'protocol-3',
        name: 'Cold Plunge',
        userId: user.id,
        isActive: true,
      },
    }),
    prisma.protocol.upsert({
      where: { id: 'protocol-4' },
      update: {},
      create: {
        id: 'protocol-4',
        name: 'NIR Sauna',
        userId: user.id,
        isActive: true,
      },
    }),
  ]);

  console.log('Created protocols:', protocols.map(p => p.name).join(', '));

  // Create daily logs for the past 7 days
  const today = new Date();
  const dailyLogs = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    // Generate varying metrics (1-6 scale)
    const energyLevel = Math.floor(Math.random() * 3) + 3 + Math.floor(i / 2); // 3-6
    const sleepQuality = Math.floor(Math.random() * 3) + 3 + Math.floor((6 - i) / 3); // 3-6
    const pain = Math.floor(Math.random() * 2) + 2; // 2-3 (lower is better for pain)
    const health = Math.floor(Math.random() * 2) + 4; // 4-5
    const mood = Math.floor(Math.random() * 3) + 3 + (i % 2); // 3-6

    const dailyLog = await prisma.dailyLog.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: date,
        },
      },
      update: {},
      create: {
        userId: user.id,
        date: date,
        energyLevel: Math.min(energyLevel, 6),
        sleepQuality: Math.min(sleepQuality, 6),
        pain: Math.min(pain, 6),
        health: Math.min(health, 6),
        mood: Math.min(mood, 6),
      },
    });

    dailyLogs.push(dailyLog);

    // Create protocol logs (randomly mark some as completed)
    await Promise.all(
      protocols.map(async (protocol, index) => {
        // More likely to complete morning meditation and keto diet
        const completionRate = index < 2 ? 0.8 : 0.5;
        const completed = Math.random() < completionRate;

        return prisma.protocolLog.upsert({
          where: {
            dailyLogId_protocolId: {
              dailyLogId: dailyLog.id,
              protocolId: protocol.id,
            },
          },
          update: {},
          create: {
            dailyLogId: dailyLog.id,
            protocolId: protocol.id,
            completed,
          },
        });
      })
    );
  }

  console.log(`Created ${dailyLogs.length} daily logs with protocol entries`);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
