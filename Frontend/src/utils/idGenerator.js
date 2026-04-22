// Generates a display ID like MD-A1B2
export function generateDisplayId() {
  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MD-${code}`;
}
