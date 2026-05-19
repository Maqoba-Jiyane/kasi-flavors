# Pricing Adjustments

The legacy platform fee feature has been retired. Stores no longer
charge a separate platform fee on orders.

## Price Adjustment System

Store owners and administrators can apply markups or discounts to prices.
This works at two levels:

1. **Store-level adjustment** – a global percentage applied to every item in
a store. Handy for site-wide sales or temporary pricing changes.
2. **Product-level adjustment** – override the store value on a per-product
basis. This lets you tweak specific menu items without touching the rest of

The UI supports both; product settings are available when creating or
editing a product, and the admin dashboard shows each product’s adjustment.

Prices entered during product creation/edit are rounded to the nearest
R0.50 (50 cents) to simplify cash handling.

### Configuration

- **Enable/Disable Adjustment** – turn the adjustment on or off.
- **Per‑Product Percentage** – each product may have its own
  `priceAdjustmentPercent` between -100 and +100 (negative for discounts).

Settings are available in the owner dashboard under *Store > Pricing*
and in the admin dashboard on the store's details page.

### Behaviour

- Adjustments apply at checkout when `priceAdjustmentEnabled` is true.
- The final item price is computed using the helper in `lib/pricing.ts`.
- Changing adjustments does not affect past orders.
- Adjustments are stored on orders to ensure consistency.

### Database Changes

- **Store model** still contains the global flags:
  ```prisma
  priceAdjustmentEnabled Boolean @default(false)
  priceAdjustmentPercent Float   @default(0)
  ```
- **Product model** gains fields to override the store defaults:
  ```prisma
  priceAdjustmentEnabled Boolean @default(false)
  priceAdjustmentPercent Float   @default(0)
  ```

The addition of product fields allows fine-grained control while leaving
existing store-level adjustments intact.

### Code Locations

- `src/lib/pricing.ts` – price calculation logic.
- components and API routes under `stores/update-price-adjustment`, etc.
- Various dashboard pages now reference the new pricing settings.

## Removal Notes

All platform fee code has been removed from:
- Database schema
- Frontend components
- Billing logic (`src/lib/billing.ts` now empty placeholder)
- Documentation and APIs

