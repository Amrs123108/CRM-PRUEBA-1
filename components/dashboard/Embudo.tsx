import { ChevronDown } from "lucide-react";
import type { EtapaDashboard } from "@/lib/datos";

export default function Embudo({ etapas }: { etapas: EtapaDashboard[] }) {
  const max = Math.max(1, ...etapas.map((e) => e.clientes));

  return (
    <div className="flex flex-1 flex-col justify-center gap-1.5">
      {etapas.map((e, i) => {
        const anterior = etapas[i - 1];
        const conversion =
          anterior && anterior.clientes > 0
            ? Math.round((e.clientes / anterior.clientes) * 100)
            : null;
        const ancho = e.clientes > 0 ? Math.max(6, Math.round((e.clientes / max) * 100)) : 2;

        return (
          <div key={e.id}>
            {i > 0 && (
              <div className="ml-1 flex items-center gap-0.5 py-0.5 text-[11px] font-medium text-zinc-400">
                <ChevronDown className="size-3" />
                {conversion === null ? "—" : `${conversion}% avanzó`}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate font-medium text-zinc-600">
                  {e.nombre}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-zinc-800">
                  {e.clientes}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${ancho}%`, background: e.color }}
                />
              </div>
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
