import type { EtapaDashboard } from "@/lib/datos";
import { formatoMonto } from "@/lib/formato";

export default function BarrasDinero({
  etapas,
  campoMonetarioNombre,
}: {
  etapas: EtapaDashboard[];
  campoMonetarioNombre: string | null;
}) {
  if (!campoMonetarioNombre) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-zinc-400">
        Marca un campo tipo Número como &ldquo;valor monetario&rdquo; en Campos
        del cliente para ver montos aquí.
      </div>
    );
  }

  const max = Math.max(1, ...etapas.map((e) => e.monto));

  return (
    <div className="flex flex-1 flex-col justify-center gap-3">
      {etapas.map((e) => {
        const ancho = e.monto > 0 ? Math.max(4, Math.round((e.monto / max) * 100)) : 0;
        return (
          <div key={e.id} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate font-medium text-zinc-600">
                {e.nombre}
              </span>
              <span className="shrink-0 font-bold tabular-nums text-zinc-800">
                {formatoMonto(e.monto)}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${ancho}%`, background: e.color }}
              />
            </div>
          </div>
        );
      })}
      {etapas.length === 0 && (
        <p className="text-center text-sm text-zinc-400">Sin etapas todavía.</p>
      )}
    </div>
  );
}
