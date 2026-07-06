// Formato de moneda para el dashboard (balboas, igual al dólar 1:1)
export function formatoMonto(n: number): string {
  return `B/. ${n.toLocaleString("es-PA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatoMontoCorto(n: number): string {
  if (n >= 1_000_000) return `B/. ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `B/. ${(n / 1_000).toFixed(1)}K`;
  return formatoMonto(n);
}
