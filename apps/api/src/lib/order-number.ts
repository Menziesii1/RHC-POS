export function createOrderNumber(date = new Date(), sequence = 1): string {
  const stamp = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `${stamp}-${String(sequence).padStart(4, "0")}`;
}
