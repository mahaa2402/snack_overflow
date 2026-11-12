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
  const alice = await prisma.user.upsert({
    where: { email: 'alice@snackoverflow.com' },
    update: { role: Role.MEMBER, password: memberPasswordHash, name: 'Alice Chen' },
    create: { email: 'alice@snackoverflow.com', name: 'Alice Chen', password: memberPasswordHash, role: Role.MEMBER },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@snackoverflow.com' },
    update: { role: Role.MEMBER, password: memberPasswordHash, name: 'Bob Miller' },
    create: { email: 'bob@snackoverflow.com', name: 'Bob Miller', password: memberPasswordHash, role: Role.MEMBER },
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@snackoverflow.com' },
    update: { role: Role.MEMBER, password: memberPasswordHash, name: 'Charlie Davis' },
    create: { email: 'charlie@snackoverflow.com', name: 'Charlie Davis', password: memberPasswordHash, role: Role.MEMBER },
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
      where: { userId_snackId: { userId: alice.id, snackId: coldBrew.id } },
      update: {},
      create: { userId: alice.id, snackId: coldBrew.id },
    });
    await prisma.vote.upsert({
      where: { userId_snackId: { userId: bob.id, snackId: coldBrew.id } },
      update: {},
      create: { userId: bob.id, snackId: coldBrew.id },
    });
    await prisma.vote.upsert({
      where: { userId_snackId: { userId: charlie.id, snackId: coldBrew.id } },
      update: {},
      create: { userId: charlie.id, snackId: coldBrew.id },
    });
  }

  if (darkChocolate) {
    await prisma.vote.upsert({
      where: { userId_snackId: { userId: alice.id, snackId: darkChocolate.id } },
      update: {},
      create: { userId: alice.id, snackId: darkChocolate.id },
    });
    await prisma.vote.upsert({
      where: { userId_snackId: { userId: bob.id, snackId: darkChocolate.id } },
      update: {},
      create: { userId: bob.id, snackId: darkChocolate.id },
    });
  }

  if (kettleChips) {
    await prisma.vote.upsert({
      where: { userId_snackId: { userId: charlie.id, snackId: kettleChips.id } },
      update: {},
      create: { userId: charlie.id, snackId: kettleChips.id },
    });
  }

  if (granolaBar) {
    await prisma.vote.upsert({
      where: { userId_snackId: { userId: alice.id, snackId: granolaBar.id } },
      update: {},
      create: { userId: alice.id, snackId: granolaBar.id },
    });
  }
  console.log('✓ Seeded initial user votes');

  // 5. Seed Activities (restocks & consumes)
  if (coldBrew && darkChocolate) {
    await prisma.activity.create({
      data: {
        userId: admin.id,
        snackId: coldBrew.id,
        action: ActivityAction.RESTOCKED,
        amount: 24,
      },
    });

    await prisma.activity.create({
      data: {
        userId: alice.id,
        snackId: coldBrew.id,
        action: ActivityAction.CONSUMED,
        amount: 1,
      },
    });

    await prisma.activity.create({
      data: {
        userId: bob.id,
        snackId: darkChocolate.id,
        action: ActivityAction.CONSUMED,
        amount: 1,
      },
    });
  }
  console.log('✓ Seeded initial pantry activities');

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
