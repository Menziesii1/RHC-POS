export function createOrderNumber(date = new Date(), sequence = 1): string {
  const stamp = date.toISOString().slice(0, 10).replaceAll("-", "");
  const randomSuffix = globalThis.crypto.randomUUID().slice(0, 6).toUpperCase();
  return `${stamp}-${String(sequence).padStart(4, "0")}-${randomSuffix}`;
}
