export function formatMoney(cents: number) {
    return `R ${(cents / 100).toFixed(2)}`;
  }