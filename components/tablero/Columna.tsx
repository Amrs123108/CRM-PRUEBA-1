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
      className={`animar-entrada flex w-72 shrink-0 flex-col rounded-xl max-h-full transition-colors duration-150 ${
        isOver ? "bg-indigo-50/80 ring-2 ring-inset ring-indigo-300/60" : "bg-zinc-100/70"
      }`}
    >
      <header
        className="flex items-center gap-2 rounded-t-xl border-t-2 px-3 py-2.5"
        style={{ borderTopColor: etapa.color }}
      >
        <span
          className="size-2.5 rounded-full shrink-0"
          style={{ backgroundColor: etapa.color }}
        />
        <h2 className="text-sm font-semibold text-zinc-800 truncate">
          {etapa.nombre}
        </h2>
        <span className="rounded-full bg-zinc-200/80 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-zinc-600">
          {etapa.clientes.length}
        </span>

        <div className="relative ml-auto" ref={refMenu}>
          <button
            onClick={() => setMenuAbierto((v) => !v)}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
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
        className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 min-h-24"
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
          <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-400">
            Sin clientes en esta etapa.
            <br />
            Arrastra una tarjeta aquí o agrega uno nuevo.
          </p>
        )}
      </div>

      <footer className="px-2 pb-2">
        <button
          onClick={() => alNuevoCliente(etapa.id)}
          className="flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-800"
        >
          <Plus className="size-4" /> Agregar cliente
        </button>
      </footer>
    </section>
  );
}
