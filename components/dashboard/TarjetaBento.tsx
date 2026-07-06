import type { ReactNode } from "react";

export function TarjetaBento({
  titulo,
  accion,
  className,
  children,
}: {
  titulo?: string;
  accion?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`animar-entrada flex flex-col rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(31,45,80,0.12)] ${className ?? ""}`}
    >
      {titulo && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            {titulo}
          </h3>
          {accion}
        </div>
      )}
      {children}
    </div>
  );
}

export function TarjetaEstadistica({
  etiqueta,
  valor,
  subtexto,
  icono: Icono,
  colorIcono,
}: {
  etiqueta: string;
  valor: string;
  subtexto?: string;
  icono: React.ComponentType<{ className?: string }>;
  colorIcono: string;
}) {
  return (
    <div className="animar-entrada flex flex-col justify-between rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(31,45,80,0.12)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          {etiqueta}
        </span>
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-lg ${colorIcono}`}
        >
          <Icono className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-zinc-900">
        {valor}
      </p>
      {subtexto && <p className="mt-0.5 text-xs text-zinc-400">{subtexto}</p>}
    </div>
  );
}
