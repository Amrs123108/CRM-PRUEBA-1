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
      className={`animar-entrada flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl bg-white max-h-full transition-shadow duration-150 ${
        isOver
          ? "shadow-[0_12px_34px_rgba(109,40,217,0.25)] ring-2 ring-violet-400/60"
          : "shadow-[0_10px_30px_rgba(31,45,80,0.12)]"
      }`}
    >
      {/* Franja superior del color de la etapa */}
      <div className="h-1.5 shrink-0" style={{ backgroundColor: etapa.color }} />

      <header className="group flex items-center gap-3 px-5 py-4">
        <h2 className="flex-1 text-[15px] font-bold uppercase leading-tight tracking-wide text-zinc-900 break-words">
          {etapa.nombre}
        </h2>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-zinc-100 text-sm font-semibold tabular-nums text-zinc-700">
          {etapa.clientes.length}
        </span>

        <div className="relative shrink-0" ref={refMenu}>
          <button
            onClick={() => setMenuAbierto((v) => !v)}
            className="rounded-md p-1 text-zinc-300 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-600 group-hover:opacity-100 focus:opacity-100"
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
