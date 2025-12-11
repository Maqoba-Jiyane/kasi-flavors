const MIN_TOPUP_CENTS = 50_00; // R50

export function getRequiredTopupCents(currentBalanceCents: number): number {
  // If balance is negative, required top up = |balance| + R50
  // Example: -R20 => 2000 cents => 5000 + 2000 = 7000 (R70)
  if (currentBalanceCents < 0) {
    return MIN_TOPUP_CENTS + Math.abs(currentBalanceCents);
  }

  // If balance is zero or positive, required top up = R50
  return MIN_TOPUP_CENTS;
}
