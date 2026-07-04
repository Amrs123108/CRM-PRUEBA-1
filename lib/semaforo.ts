// Semáforo de vencimiento del Kanban.
// Compara solo fechas (sin hora): vencida = Tarde; dentro de los días de
// aviso = Cerca de vencer; más lejos = A tiempo; sin fecha = neutral.

export type EstadoVencimiento = "tarde" | "cerca" | "a-tiempo" | "sin-fecha";

export function estadoVencimiento(
  fechaLimite: Date | null | undefined,
  diasAviso: number,
  hoy: Date = new Date()
): EstadoVencimiento {
  if (!fechaLimite) return "sin-fecha";
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const limite = new Date(
    fechaLimite.getFullYear(),
    fechaLimite.getMonth(),
    fechaLimite.getDate()
  );
  const diasRestantes = Math.round(
    (limite.getTime() - inicioHoy.getTime()) / 86_400_000
  );
  if (diasRestantes < 0) return "tarde";
  if (diasRestantes <= diasAviso) return "cerca";
  return "a-tiempo";
}

export const ETIQUETA_ESTADO: Record<EstadoVencimiento, string> = {
  tarde: "Tarde",
  cerca: "Por vencer",
  "a-tiempo": "A tiempo",
  "sin-fecha": "Sin fecha",
};
