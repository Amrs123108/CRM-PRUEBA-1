import type { DashboardDatos } from "@/lib/datos";
import { formatoMonto } from "@/lib/formato";

const GRUPOS: {
  clave: keyof DashboardDatos["vencimiento"];
  etiqueta: string;
  colorBarra: string;
  colorPunto: string;
}[] = [
  { clave: "tarde", etiqueta: "Tarde", colorBarra: "bg-red-500", colorPunto: "bg-red-500" },
  { clave: "cerca", etiqueta: "Por vencer", colorBarra: "bg-amber-500", colorPunto: "bg-amber-500" },
  { clave: "aTiempo", etiqueta: "A tiempo", colorBarra: "bg-emerald-500", colorPunto: "bg-emerald-500" },
  { clave: "sinFecha", etiqueta: "Sin fecha", colorBarra: "bg-zinc-300", colorPunto: "bg-zinc-300" },
];

export default function Vencimiento({
  datos,
}: {
  datos: DashboardDatos["vencimiento"];
}) {
  const total =
    Object.values(datos).reduce((a, g) => a + g.clientes, 0) || 1;

  return (
    <div className="flex flex-1 flex-col justify-center gap-4">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100">
        {GRUPOS.map(({ clave, colorBarra }) => {
          const pct = (datos[clave].clientes / total) * 100;
          if (pct === 0) return null;
          return <div key={clave} className={colorBarra} style={{ width: `${pct}%` }} />;
        })}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {GRUPOS.map(({ clave, etiqueta, colorPunto }) => {
          const g = datos[clave];
          return (
            <div key={clave} className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
                <span className={`size-2 rounded-full ${colorPunto}`} />
                {etiqueta}
              </span>
              <span className="text-lg font-bold tabular-nums text-zinc-900">
                {g.clientes}
              </span>
              <span className="text-[11px] text-zinc-400">
                {formatoMonto(g.monto)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
