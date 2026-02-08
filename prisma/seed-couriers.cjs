// prisma/seed-couriers.cjs
const { PrismaClient, UserRole } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🚗 Seeding Courier sample data...");

    // Step 1: Get existing stores (or create if needed)
    let stores = await prisma.store.findMany();
    
    if (stores.length === 0) {
      console.warn("⚠️  No stores found. Creating sample stores...");
      const store1 = await prisma.store.create({
        data: {
          name: "Soweto Tasty Eats",
          slug: "soweto-tasty",
          address: "123 Main St",
          city: "Johannesburg",
          area: "Soweto",
          ownerId: "placeholder-owner-id", // This will fail - you need a real owner
        },
      });
      stores = [store1];
    }

    // Step 2: Create delivery users (if they don't exist)
    const courierEmails = [
      {
        clerkUserId: "demo-courier-1",
        name: "Thabo Ndlela",
        email: "thabo.courier@kasi-eats.test",
        phone: "0731234567",
      },
      {
        clerkUserId: "demo-courier-2",
        name: "Mthunzi Khumalo",
        email: "mthunzi.courier@kasi-eats.test",
        phone: "0741234567",
      },
      {
        clerkUserId: "demo-courier-3",
        name: "Neo Dlamini",
        email: "neo.courier@kasi-eats.test",
        phone: "0751234567",
      },
    ];

    const users = [];

    for (const courierData of courierEmails) {
      const existingUser = await prisma.user.findUnique({
        where: { email: courierData.email },
      });

      if (existingUser) {
        console.log(`ℹ️  User already exists: ${courierData.name}`);
        users.push(existingUser);
      } else {
        const newUser = await prisma.user.create({
          data: {
            clerkUserId: courierData.clerkUserId,
            role: UserRole.DELIVERY,
            name: courierData.name,
            email: courierData.email,
            phone: courierData.phone,
          },
        });
        console.log(`✅ Created courier user: ${newUser.name}`);
        users.push(newUser);
      }
    }

    // Step 3: Create courier assignments
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const store = stores[i % stores.length]; // Distribute across stores

      // Check if assignment already exists
      const existingCourier = await prisma.courier.findUnique({
        where: { userId: user.id },
      });

      if (existingCourier) {
        console.log(`ℹ️  Courier assignment already exists for ${user.name}`);
      } else {
        const courier = await prisma.courier.create({
          data: {
            userId: user.id,
            storeId: store.id,
            isActive: true,
          },
        });
        console.log(`✅ Created courier assignment: ${user.name} -> ${store.name}`);
      }
    }

    console.log("\n🎉 Courier sample data seeded successfully!");
    console.log("\n📝 Test Accounts:");
    users.forEach((user) => {
      console.log(`   Email: ${user.email}`);
    });

  } catch (error) {
    console.error("❌ Error seeding data:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
