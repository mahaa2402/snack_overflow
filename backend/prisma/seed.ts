import { PrismaClient, Role, SnackCategory, ActivityAction } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function main() {
  console.log('🌱 Starting database seed for Snack Overflow...');

  const adminPasswordHash = await bcrypt.hash('Admin@123', SALT_ROUNDS);
  const memberPasswordHash = await bcrypt.hash('Member@123', SALT_ROUNDS);

  // 1. Seed ADMIN account
  const admin = await prisma.user.upsert({
    where: { email: 'admin@snackoverflow.com' },
    update: {
      role: Role.ADMIN,
      password: adminPasswordHash,
      name: 'Admin User',
    },
    create: {
      email: 'admin@snackoverflow.com',
      name: 'Admin User',
      password: adminPasswordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`✓ Admin user: ${admin.email}`);

  // 2. Seed MEMBER accounts
  const priya = await prisma.user.upsert({
    where: { email: 'priya@snackoverflow.com' },
    update: { role: Role.MEMBER, password: memberPasswordHash, name: 'Priya' },
    create: { email: 'priya@snackoverflow.com', name: 'Priya', password: memberPasswordHash, role: Role.MEMBER },
  });

  const rekha = await prisma.user.upsert({
    where: { email: 'rekha@snackoverflow.com' },
    update: { role: Role.MEMBER, password: memberPasswordHash, name: 'Rekha' },
    create: { email: 'rekha@snackoverflow.com', name: 'Rekha', password: memberPasswordHash, role: Role.MEMBER },
  });

  const karthik = await prisma.user.upsert({
    where: { email: 'karthik@snackoverflow.com' },
    update: { role: Role.MEMBER, password: memberPasswordHash, name: 'Karthik' },
    create: { email: 'karthik@snackoverflow.com', name: 'Karthik', password: memberPasswordHash, role: Role.MEMBER },
  });
  console.log('✓ Member users seeded');

  // 3. Seed Snacks
  const snackList = [
    // SWEET
    { name: 'Dark Chocolate Almond Bark', category: SnackCategory.SWEET, quantity: 18, lowStockThreshold: 5 },
    { name: ' Glazed Donuts', category: SnackCategory.SWEET, quantity: 3, lowStockThreshold: 5 }, // RUNNING_LOW
    { name: 'Organic Gummy Bears', category: SnackCategory.SWEET, quantity: 0, lowStockThreshold: 5 }, // GONE
    { name: 'Cinnamon Sugar Pretzel Bites', category: SnackCategory.SWEET, quantity: 12, lowStockThreshold: 4 },
    // SAVOURY
    { name: 'Kettle Cooked Sea Salt Chips', category: SnackCategory.SAVOURY, quantity: 24, lowStockThreshold: 6 },
    { name: 'White Cheddar Popcorn', category: SnackCategory.SAVOURY, quantity: 14, lowStockThreshold: 5 },
    { name: 'Smoked Paprika Crisps', category: SnackCategory.SAVOURY, quantity: 4, lowStockThreshold: 5 }, // RUNNING_LOW
    { name: 'Spicy Sriracha Cashews', category: SnackCategory.SAVOURY, quantity: 9, lowStockThreshold: 4 },
    // DRINK
    { name: 'Cold Brew Coffee Can', category: SnackCategory.DRINK, quantity: 22, lowStockThreshold: 6 },
    { name: 'Sparkling Lime Water', category: SnackCategory.DRINK, quantity: 30, lowStockThreshold: 8 },
    { name: 'Organic Ginger Kombucha', category: SnackCategory.DRINK, quantity: 2, lowStockThreshold: 5 }, // RUNNING_LOW
    { name: 'Matcha Green Tea Latte', category: SnackCategory.DRINK, quantity: 0, lowStockThreshold: 4 }, // GONE
    // HEALTHY_ISH
    { name: 'Roasted Salted Edamame', category: SnackCategory.HEALTHY_ISH, quantity: 15, lowStockThreshold: 4 },
    { name: 'Mixed Berry Granola Bar', category: SnackCategory.HEALTHY_ISH, quantity: 20, lowStockThreshold: 5 },
    { name: 'Freeze-Dried Strawberries', category: SnackCategory.HEALTHY_ISH, quantity: 5, lowStockThreshold: 5 }, // RUNNING_LOW
    { name: 'Greek Yogurt Cups', category: SnackCategory.HEALTHY_ISH, quantity: 8, lowStockThreshold: 4 },
  ];

  const createdSnacks = [];
  for (const s of snackList) {
    const snack = await prisma.snack.upsert({
      where: { name: s.name },
      update: {
        category: s.category,
        quantity: s.quantity,
        lowStockThreshold: s.lowStockThreshold,
      },
      create: s,
    });
    createdSnacks.push(snack);
  }
  console.log(`✓ Seeded ${createdSnacks.length} snacks`);

  // 4. Seed Votes (Popular snack: Cold Brew Coffee Can and Dark Chocolate Almond Bark)
  const coldBrew = createdSnacks.find((s) => s.name === 'Cold Brew Coffee Can');
  const darkChocolate = createdSnacks.find((s) => s.name === 'Dark Chocolate Almond Bark');
  const kettleChips = createdSnacks.find((s) => s.name === 'Kettle Cooked Sea Salt Chips');
  const granolaBar = createdSnacks.find((s) => s.name === 'Mixed Berry Granola Bar');

  if (coldBrew) {
    // 3 votes for Cold Brew (Top snack of the week!)
    await prisma.vote.upsert({
      where: { userId_snackId: { userId: priya.id, snackId: coldBrew.id } },
      update: {},
      create: { userId: priya.id, snackId: coldBrew.id },
    });
    await prisma.vote.upsert({
      where: { userId_snackId: { userId: rekha.id, snackId: coldBrew.id } },
      update: {},
      create: { userId: rekha.id, snackId: coldBrew.id },
    });
    await prisma.vote.upsert({
      where: { userId_snackId: { userId: karthik.id, snackId: coldBrew.id } },
      update: {},
      create: { userId: karthik.id, snackId: coldBrew.id },
    });
  }

  if (darkChocolate) {
    await prisma.vote.upsert({
      where: { userId_snackId: { userId: priya.id, snackId: darkChocolate.id } },
      update: {},
      create: { userId: priya.id, snackId: darkChocolate.id },
    });
    await prisma.vote.upsert({
      where: { userId_snackId: { userId: rekha.id, snackId: darkChocolate.id } },
      update: {},
      create: { userId: rekha.id, snackId: darkChocolate.id },
    });
  }

  if (kettleChips) {
    await prisma.vote.upsert({
      where: { userId_snackId: { userId: karthik.id, snackId: kettleChips.id } },
      update: {},
      create: { userId: karthik.id, snackId: kettleChips.id },
    });
  }

  if (granolaBar) {
    await prisma.vote.upsert({
      where: { userId_snackId: { userId: priya.id, snackId: granolaBar.id } },
      update: {},
      create: { userId: priya.id, snackId: granolaBar.id },
    });
  }
  console.log('✓ Seeded initial user votes');

  // 5. Seed Activities (Historical restocks & consumes for dynamic trend analysis)
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const sampleActivities = [
    // 6 days ago
    { user: admin, snack: coldBrew, action: ActivityAction.RESTOCKED, amount: 30, daysAgo: 6 },
    { user: priya, snack: coldBrew, action: ActivityAction.CONSUMED, amount: 2, daysAgo: 6 },
    { user: rekha, snack: darkChocolate, action: ActivityAction.CONSUMED, amount: 1, daysAgo: 6 },
    { user: karthik, snack: kettleChips, action: ActivityAction.CONSUMED, amount: 2, daysAgo: 6 },

    // 5 days ago
    { user: priya, snack: granolaBar, action: ActivityAction.CONSUMED, amount: 1, daysAgo: 5 },
    { user: rekha, snack: coldBrew, action: ActivityAction.CONSUMED, amount: 2, daysAgo: 5 },
    { user: karthik, snack: darkChocolate, action: ActivityAction.CONSUMED, amount: 1, daysAgo: 5 },

    // 4 days ago
    { user: admin, snack: kettleChips, action: ActivityAction.RESTOCKED, amount: 25, daysAgo: 4 },
    { user: priya, snack: kettleChips, action: ActivityAction.CONSUMED, amount: 3, daysAgo: 4 },
    { user: rekha, snack: granolaBar, action: ActivityAction.CONSUMED, amount: 2, daysAgo: 4 },
    { user: karthik, snack: coldBrew, action: ActivityAction.CONSUMED, amount: 1, daysAgo: 4 },

    // 3 days ago
    { user: priya, snack: darkChocolate, action: ActivityAction.CONSUMED, amount: 2, daysAgo: 3 },
    { user: rekha, snack: kettleChips, action: ActivityAction.CONSUMED, amount: 2, daysAgo: 3 },
    { user: karthik, snack: granolaBar, action: ActivityAction.CONSUMED, amount: 1, daysAgo: 3 },

    // 2 days ago
    { user: priya, snack: coldBrew, action: ActivityAction.CONSUMED, amount: 3, daysAgo: 2 },
    { user: rekha, snack: darkChocolate, action: ActivityAction.CONSUMED, amount: 2, daysAgo: 2 },
    { user: karthik, snack: kettleChips, action: ActivityAction.CONSUMED, amount: 1, daysAgo: 2 },

    // 1 day ago
    { user: admin, snack: darkChocolate, action: ActivityAction.RESTOCKED, amount: 20, daysAgo: 1 },
    { user: priya, snack: kettleChips, action: ActivityAction.CONSUMED, amount: 2, daysAgo: 1 },
    { user: rekha, snack: coldBrew, action: ActivityAction.CONSUMED, amount: 2, daysAgo: 1 },

    // Today
    { user: karthik, snack: coldBrew, action: ActivityAction.CONSUMED, amount: 2, daysAgo: 0 },
    { user: priya, snack: darkChocolate, action: ActivityAction.CONSUMED, amount: 1, daysAgo: 0 },
    { user: rekha, snack: granolaBar, action: ActivityAction.CONSUMED, amount: 1, daysAgo: 0 },
  ];

  for (const item of sampleActivities) {
    if (item.snack && item.user) {
      await prisma.activity.create({
        data: {
          userId: item.user.id,
          snackId: item.snack.id,
          action: item.action,
          amount: item.amount,
          createdAt: new Date(now.getTime() - item.daysAgo * dayMs - Math.random() * 3600000),
        },
      });
    }
  }
  console.log(`✓ Seeded ${sampleActivities.length} realistic historical pantry activities`);

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
