// prisma/seed.cjs
const {
  PrismaClient,
  UserRole,
  FulfilmentType,
  PaymentMethod,
  OrderStatus,
// eslint-disable-next-line @typescript-eslint/no-require-imports
} = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1) USERS
  const admin = await prisma.user.create({
    data: {
      clerkUserId: "demo-admin",
      role: UserRole.ADMIN,
      name: "Platform Admin",
      email: "admin@kasi-eats.test",
      phone: "0600000000",
    },
  });

  const sowetoOwner = await prisma.user.create({
    data: {
      clerkUserId: "demo-soweto-owner",
      role: UserRole.STORE_OWNER,
      name: "Mama Fikile",
      email: "mama.fikile@kasi-eats.test",
      phone: "0611111111",
    },
  });

  const alexOwner = await prisma.user.create({
    data: {
      clerkUserId: "demo-alex-owner",
      role: UserRole.STORE_OWNER,
      name: "Bra Thabo",
      email: "bra.thabo@kasi-eats.test",
      phone: "0622222222",
    },
  });

  const demoCustomer = await prisma.user.create({
    data: {
      clerkUserId: "demo-customer",
      role: UserRole.CUSTOMER,
      name: "Lerato M",
      email: "lerato@kasi-eats.test",
      phone: "0733333333",
    },
  });

  console.log("✅ Users created");

  // 2) STORES
  const sowetoStore = await prisma.store.create({
    data: {
      name: "Mama Fikile's Kota Spot",
      slug: "mama-fikiles-kota-spot",
      description:
        "Legendary fat cakes, deluxe kotas and Russian specials in the heart of Soweto.",
      address: "Corner Sekhukhune & Vilakazi Street",
      city: "Johannesburg",
      area: "Soweto - Orlando East",
      avgPrepTimeMinutes: 25,
      isOpen: true,
      ownerId: sowetoOwner.id,
    },
  });

  const alexStore = await prisma.store.create({
    data: {
      name: "Bra Thabo's Shisanyama & Grill",
      slug: "bra-thabos-shisanyama",
      description:
        "Local favourite for wings, wors, pap and chakalaka – straight from the braai.",
      address: "Next to the taxi rank",
      city: "Johannesburg",
      area: "Alexandra",
      avgPrepTimeMinutes: 35,
      isOpen: true,
      ownerId: alexOwner.id,
    },
  });

  console.log("✅ Stores created");

  // 3) PRODUCTS
  const sowetoProducts = await prisma.product.createMany({
    data: [
      {
        storeId: sowetoStore.id,
        name: "Classic Kota",
        description:
          "Quarter loaf with chips, Russian, slice of cheese and atchar.",
        priceCents: 4500,
        imageUrl: "",
        isAvailable: true,
      },
      {
        storeId: sowetoStore.id,
        name: "Full House Kota",
        description:
          "Quarter loaf loaded with polony, Russian, egg, cheese, chips and atchar.",
        priceCents: 6500,
        imageUrl: "",
        isAvailable: true,
      },
      {
        storeId: sowetoStore.id,
        name: "Cheese Russian & Chips",
        description: "Grilled Russian, melted cheese and slap chips.",
        priceCents: 5500,
        imageUrl: "",
        isAvailable: true,
      },
      {
        storeId: sowetoStore.id,
        name: "Vetkoek & Mince",
        description: "Golden vetkoek stuffed with savoury mince.",
        priceCents: 3800,
        imageUrl: "",
        isAvailable: true,
      },
      {
        storeId: sowetoStore.id,
        name: "2L Cooldrink",
        description: "Assorted flavours, depends on availability.",
        priceCents: 3000,
        imageUrl: "",
        isAvailable: true,
      },
    ],
  });

  const alexProducts = await prisma.product.createMany({
    data: [
      {
        storeId: alexStore.id,
        name: "1/4 Pap & Wors",
        description: "Pap, wors, chakalaka and side salad.",
        priceCents: 5500,
        imageUrl: "",
        isAvailable: true,
      },
      {
        storeId: alexStore.id,
        name: "Chicken Wings (6) & Pap",
        description: "Braai wings in special sauce with pap & chakalaka.",
        priceCents: 7000,
        imageUrl: "",
        isAvailable: true,
      },
      {
        storeId: alexStore.id,
        name: "T-Bone Steak & Pap",
        description: "Grilled T-bone steak with pap and chakalaka.",
        priceCents: 9500,
        imageUrl: "",
        isAvailable: true,
      },
      {
        storeId: alexStore.id,
        name: "Wors Roll",
        description: "Grilled wors in a roll with chakalaka.",
        priceCents: 4000,
        imageUrl: "",
        isAvailable: true,
      },
      {
        storeId: alexStore.id,
        name: "500ml Cooldrink",
        description: "Assorted soft drinks.",
        priceCents: 1800,
        imageUrl: "",
        isAvailable: true,
      },
    ],
  });

  console.log("✅ Products created", {
    sowetoProducts: sowetoProducts.count,
    alexProducts: alexProducts.count,
  });

  // 4) SAMPLE ORDERS (for dashboards / testing)
  const sowetoMenu = await prisma.product.findMany({
    where: { storeId: sowetoStore.id },
  });
  const alexMenu = await prisma.product.findMany({
    where: { storeId: alexStore.id },
  });

  const p = (products, name) => products.find((x) => x.name === name);

  // 4.1 SOWETO ORDER – COLLECTION
  {
    const classicKota = p(sowetoMenu, "Classic Kota");
    const cooldrink = p(sowetoMenu, "2L Cooldrink");

    const totalCents = classicKota.priceCents * 2 + cooldrink.priceCents;

    const now = new Date();
    const estimated = new Date(
      now.getTime() + sowetoStore.avgPrepTimeMinutes * 60_000,
    );

    const order = await prisma.order.create({
      data: {
        storeId: sowetoStore.id,
        customerId: demoCustomer.id,
        customerName: demoCustomer.name,
        customerPhone: demoCustomer.phone ?? "0733333333",
        fulfilmentType: FulfilmentType.COLLECTION,
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        status: OrderStatus.IN_PREPARATION,
        totalCents,
        pickupCode: "123456",
        estimatedReadyAt: estimated,
        items: {
          create: [
            {
              productId: classicKota.id,
              name: classicKota.name,
              quantity: 2,
              unitCents: classicKota.priceCents,
              totalCents: classicKota.priceCents * 2,
            },
            {
              productId: cooldrink.id,
              name: cooldrink.name,
              quantity: 1,
              unitCents: cooldrink.priceCents,
              totalCents: cooldrink.priceCents,
            },
          ],
        },
      },
    });

    console.log("✅ Sample Soweto order created:", order.id);
  }

  // 4.2 ALEX ORDER – DELIVERY (COMPLETED)
  {
    const wings = p(alexMenu, "Chicken Wings (6) & Pap");
    const drink = p(alexMenu, "500ml Cooldrink");

    const totalCents = wings.priceCents + drink.priceCents;

    const createdAt = new Date(Date.now() - 45 * 60_000); // 45 minutes ago
    const completedAt = new Date();

    const order = await prisma.order.create({
      data: {
        storeId: alexStore.id,
        customerId: demoCustomer.id,
        customerName: demoCustomer.name,
        customerPhone: demoCustomer.phone ?? "0733333333",
        fulfilmentType: FulfilmentType.DELIVERY,
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        status: OrderStatus.COMPLETED,
        totalCents,
        deliveryAddress: "House behind the rank, blue gate, Alex",
        note: "Call when you arrive, dogs in the yard.",
        pickupCode: "654321",
        estimatedReadyAt: new Date(
          createdAt.getTime() + alexStore.avgPrepTimeMinutes * 60_000,
        ),
        createdAt,
        completedAt,
        items: {
          create: [
            {
              productId: wings.id,
              name: wings.name,
              quantity: 1,
              unitCents: wings.priceCents,
              totalCents: wings.priceCents,
            },
            {
              productId: drink.id,
              name: drink.name,
              quantity: 1,
              unitCents: drink.priceCents,
              totalCents: drink.priceCents,
            },
          ],
        },
      },
    });

    console.log("✅ Sample Alex order created:", order.id);
  }

  console.log("🌱 Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    prisma.$disconnect();
  });
