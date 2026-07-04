"use client";

import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { EtapaConClientes, ClienteCompleto } from "@/lib/tipos";
import Tarjeta from "./Tarjeta";

// Degradado diagonal del color de la etapa, estilo de la referencia visual:
// parte del color base y termina en un tono más brillante con leve giro de matiz
function hexAHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function degradadoEtapa(color: string): string {
  const [h, s, l] = hexAHsl(color);
  const inicio = `hsl(${h.toFixed(0)} ${Math.min(s + 6, 100).toFixed(0)}% ${Math.max(l - 4, 0).toFixed(0)}%)`;
  const fin = `hsl(${((h + 16) % 360).toFixed(0)} ${Math.min(s + 10, 100).toFixed(0)}% ${Math.min(l + 10, 92).toFixed(0)}%)`;
  return `linear-gradient(135deg, ${inicio} 0%, ${fin} 100%)`;
}

type Props = {
  etapa: EtapaConClientes;
  diasAviso: number;
  esPrimera: boolean;
  esUltima: boolean;
  alAbrirCliente: (cliente: ClienteCompleto) => void;
  alNuevoCliente: (etapaId: string) => void;
  alEditarEtapa: (etapa: EtapaConClientes) => void;
  alEliminarEtapa: (etapa: EtapaConClientes) => void;
  alMoverEtapa: (id: string, direccion: -1 | 1) => void;
};

export default function Columna({
  etapa,
  diasAviso,
  esPrimera,
  esUltima,
  alAbrirCliente,
  alNuevoCliente,
  alEditarEtapa,
  alEliminarEtapa,
  alMoverEtapa,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${etapa.id}`,
    data: { tipo: "columna", etapaId: etapa.id },
  });
  const [menuAbierto, setMenuAbierto] = useState(false);
  const refMenu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuAbierto) return;
    const cerrar = (e: MouseEvent) => {
      if (!refMenu.current?.contains(e.target as Node)) setMenuAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [menuAbierto]);

  return (
    <section
      className={`animar-entrada flex w-full flex-col overflow-hidden rounded-2xl bg-white max-h-full transition-shadow duration-150 ${
        isOver
          ? "shadow-[0_12px_34px_rgba(109,40,217,0.25)] ring-2 ring-violet-400/60"
          : "shadow-[0_10px_30px_rgba(31,45,80,0.12)]"
      }`}
    >
      {/* Header recubierto con degradado del color de la etapa */}
      <header
        className="group flex items-center gap-3 px-5 py-4"
        style={{ background: degradadoEtapa(etapa.color) }}
      >
        <h2 className="flex-1 text-[15px] font-bold uppercase leading-tight tracking-wide text-white break-words [text-shadow:0_1px_2px_rgba(0,0,0,0.12)]">
          {etapa.nombre}
        </h2>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/25 text-sm font-semibold tabular-nums text-white">
          {etapa.clientes.length}
        </span>

        <div className="relative shrink-0" ref={refMenu}>
          <button
            onClick={() => setMenuAbierto((v) => !v)}
            className="rounded-md p-1 text-white/70 opacity-0 transition-opacity hover:bg-white/20 hover:text-white group-hover:opacity-100 focus:opacity-100"
            aria-label={`Opciones de la etapa ${etapa.nombre}`}
          >
            <MoreHorizontal className="size-4" />
          </button>

          {menuAbierto && (
            <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
              <button
                onClick={() => {
                  setMenuAbierto(false);
                  alEditarEtapa(etapa);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <Pencil className="size-3.5" /> Editar etapa
              </button>
              {!esPrimera && (
                <button
                  onClick={() => {
                    setMenuAbierto(false);
                    alMoverEtapa(etapa.id, -1);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  <ChevronLeft className="size-3.5" /> Mover a la izquierda
                </button>
              )}
              {!esUltima && (
                <button
                  onClick={() => {
                    setMenuAbierto(false);
                    alMoverEtapa(etapa.id, 1);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  <ChevronRight className="size-3.5" /> Mover a la derecha
                </button>
              )}
              <button
                onClick={() => {
                  setMenuAbierto(false);
                  alEliminarEtapa(etapa);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="size-3.5" /> Eliminar etapa
              </button>
            </div>
          )}
        </div>
      </header>

      <div
        ref={setNodeRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[#f5f8fc] px-4 pb-3 pt-4 min-h-28"
      >
        <SortableContext
          items={etapa.clientes.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {etapa.clientes.map((cliente) => (
            <Tarjeta
              key={cliente.id}
              cliente={cliente}
              diasAviso={diasAviso}
              alAbrir={alAbrirCliente}
            />
          ))}
        </SortableContext>

        {etapa.clientes.length === 0 && (
          <div className="rounded-xl bg-white/60 px-4 py-8 text-center shadow-[inset_0_0_0_1px_rgba(31,45,80,0.06)]">
            <p className="text-[13px] text-zinc-400">
              Sin clientes en esta etapa.
              <br />
              Arrastra una tarjeta aquí o agrega uno nuevo.
            </p>
          </div>
        )}
      </div>

      <footer className="bg-[#f5f8fc] px-4 pb-4">
        <button
          onClick={() => alNuevoCliente(etapa.id)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-[15px] font-medium text-zinc-700 shadow-sm transition-shadow hover:shadow"
        >
          <Plus className="size-4 text-zinc-400" /> Agregar cliente
        </button>
      </footer>
    </section>
  );
}
