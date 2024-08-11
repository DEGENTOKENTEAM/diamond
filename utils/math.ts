export function expandDecimals(n: number, decimals: number) {
  return BigInt(n) * 10n ** BigInt(decimals);
}
