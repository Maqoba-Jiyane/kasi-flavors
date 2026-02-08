# Courier Sample Data

This file contains sample data for testing the Courier delivery system.

## Prerequisites
- You need at least one Store record
- You need User records with `role: "DELIVERY"`

## Step 1: Create Delivery Users

```javascript
// In your database or seed file
const courier1 = await prisma.user.create({
  data: {
    clerkUserId: "demo-courier-1",
    role: "DELIVERY", // Make sure this is the UserRole.DELIVERY
    name: "Thabo Ndlela",
    email: "thabo.courier@kasi-eats.test",
    phone: "0731234567",
  },
});

const courier2 = await prisma.user.create({
  data: {
    clerkUserId: "demo-courier-2",
    role: "DELIVERY",
    name: "Mthunzi Khumalo",
    email: "mthunzi.courier@kasi-eats.test",
    phone: "0741234567",
  },
});

const courier3 = await prisma.user.create({
  data: {
    clerkUserId: "demo-courier-3",
    role: "DELIVERY",
    name: "Neo Dlamini",
    email: "neo.courier@kasi-eats.test",
    phone: "0751234567",
  },
});
```

## Step 2: Assign Couriers to Stores

```javascript
// Assign couriers to your stores
// You need the storeId from an existing store

const courier1Assignment = await prisma.courier.create({
  data: {
    userId: courier1.id,      // ID of the delivery user
    storeId: sowetoStore.id,  // ID of the store to assign to
    isActive: true,
  },
});

const courier2Assignment = await prisma.courier.create({
  data: {
    userId: courier2.id,
    storeId: sowetoStore.id,
    isActive: true,
  },
});

const courier3Assignment = await prisma.courier.create({
  data: {
    userId: courier3.id,
    storeId: alexStore.id,    // Different store
    isActive: true,
  },
});
```

## Complete Example (Ready to Paste)

If you want to add this to your seed file:

```javascript
// Add this after your existing users and stores are created

const courier1 = await prisma.user.create({
  data: {
    clerkUserId: "demo-courier-1",
    role: UserRole.DELIVERY,
    name: "Thabo Ndlela",
    email: "thabo.courier@kasi-eats.test",
    phone: "0731234567",
  },
});

const courier2 = await prisma.user.create({
  data: {
    clerkUserId: "demo-courier-2",
    role: UserRole.DELIVERY,
    name: "Mthunzi Khumalo",
    email: "mthunzi.courier@kasi-eats.test",
    phone: "0741234567",
  },
});

const courier3 = await prisma.user.create({
  data: {
    clerkUserId: "demo-courier-3",
    role: UserRole.DELIVERY,
    name: "Neo Dlamini",
    email: "neo.courier@kasi-eats.test",
    phone: "0751234567",
  },
});

// Assign couriers to stores
// (Replace sowetoStore.id and alexStore.id with actual store IDs from your database)
await prisma.courier.create({
  data: {
    userId: courier1.id,
    storeId: sowetoStore.id,
    isActive: true,
  },
});

await prisma.courier.create({
  data: {
    userId: courier2.id,
    storeId: sowetoStore.id,
    isActive: true,
  },
});

await prisma.courier.create({
  data: {
    userId: courier3.id,
    storeId: alexStore.id,
    isActive: true,
  },
});
```

## MongoDB Direct Insert (if needed)

If you prefer to insert directly into MongoDB:

```javascript
db.getCollection("User").insertMany([
  {
    _id: ObjectId("..."),
    clerkUserId: "demo-courier-1",
    role: "DELIVERY",
    name: "Thabo Ndlela",
    email: "thabo.courier@kasi-eats.test",
    phone: "0731234567",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId("..."),
    clerkUserId: "demo-courier-2",
    role: "DELIVERY",
    name: "Mthunzi Khumalo",
    email: "mthunzi.courier@kasi-eats.test",
    phone: "0741234567",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]);

db.getCollection("Courier").insertMany([
  {
    _id: ObjectId("..."),
    userId: ObjectId("..."), // ID of courier1
    storeId: ObjectId("..."), // ID of store
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId("..."),
    userId: ObjectId("..."), // ID of courier2
    storeId: ObjectId("..."), // ID of same store
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]);
```

## Testing the Delivery Page

Once you have courier data:

1. Sign in with a courier's email (e.g., `thabo.courier@kasi-eats.test`)
2. Navigate to `/delivery`
3. You should see all delivery orders for their assigned store
4. If you don't have any delivery orders yet, create some orders with:
   - `fulfilmentType: "DELIVERY"`
   - Same `storeId` as the courier's assignment
   - Status in: `ACCEPTED`, `IN_PREPARATION`, `READY_FOR_COLLECTION`, or `OUT_FOR_DELIVERY`

## Disabling a Courier

To temporarily disable a courier:

```javascript
await prisma.courier.update({
  where: { userId: courier1.id },
  data: { isActive: false },
});
```

The courier will see an "Access Denied" message when trying to access the delivery page.

## Important Notes

- Each user can only have ONE courier assignment (userId is unique on Courier model)
- Couriers only see delivery orders from their assigned store
- Only users with `role: "DELIVERY"` should have courier assignments
- The `isActive` flag allows you to enable/disable couriers without deleting them
