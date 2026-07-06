"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { guardarMeta } from "@/lib/acciones/metas";

const estiloInput =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const estiloLabel = "mb-1 block text-xs font-medium text-zinc-600";

export default function ModalMeta({
  moduloId,
  moduloNombre,
  mes,
  metaClientes,
  metaMonto,
  alCerrar,
}: {
  moduloId: string;
  moduloNombre: string;
  mes: string;
  metaClientes: number;
  metaMonto: number;
  alCerrar: () => void;
}) {
  const [clientes, setClientes] = useState(String(metaClientes));
  const [monto, setMonto] = useState(String(metaMonto));
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const nombreMes = new Date(`${mes}-01T00:00:00`).toLocaleDateString("es-PA", {
    month: "long",
    year: "numeric",
  });

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const res = await guardarMeta({
      moduloId,
      mes,
      metaClientes: Number(clientes) || 0,
      metaMonto: Number(monto) || 0,
    });
    setGuardando(false);
    if (res.ok) alCerrar();
    else setError(res.error);
  }

  return (
    <div
      className="animar-fondo fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) alCerrar();
      }}
    >
      <div className="animar-modal w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">
            Meta de {moduloNombre}
          </h2>
          <button
            onClick={alCerrar}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mb-4 text-xs capitalize text-zinc-400">{nombreMes}</p>
        <form onSubmit={guardar} className="space-y-3">
          <div>
            <label className={estiloLabel}>
              Meta de clientes en la última etapa
            </label>
            <input
              type="number"
              min={0}
              value={clientes}
              onChange={(e) => setClientes(e.target.value)}
              className={estiloInput}
            />
          </div>
          <div>
            <label className={estiloLabel}>Meta de monto logrado (B/.)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className={estiloInput}
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={alCerrar}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Guardar meta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
