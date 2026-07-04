"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, Paperclip } from "lucide-react";
import type { ClienteCompleto } from "@/lib/tipos";
import {
  estadoVencimiento,
  ETIQUETA_ESTADO,
  type EstadoVencimiento,
} from "@/lib/semaforo";

const ESTILO_BADGE: Record<EstadoVencimiento, string> = {
  tarde: "bg-red-50 text-red-700 ring-red-600/20",
  cerca: "bg-amber-50 text-amber-700 ring-amber-600/20",
  "a-tiempo": "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "sin-fecha": "bg-zinc-100 text-zinc-500 ring-zinc-500/10",
};

const PUNTO_BADGE: Record<EstadoVencimiento, string> = {
  tarde: "bg-red-500",
  cerca: "bg-amber-500",
  "a-tiempo": "bg-emerald-500",
  "sin-fecha": "bg-zinc-400",
};

function formatearFecha(fecha: Date): string {
  return new Date(fecha).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  cliente: ClienteCompleto;
  diasAviso: number;
  alAbrir: (cliente: ClienteCompleto) => void;
  arrastrando?: boolean; // true cuando se renderiza dentro del DragOverlay
};

export function ContenidoTarjeta({ cliente, diasAviso }: Pick<Props, "cliente" | "diasAviso">) {
  const estado = estadoVencimiento(
    cliente.fechaLimite ? new Date(cliente.fechaLimite) : null,
    diasAviso
  );
  const valoresVisibles = cliente.valores.slice(0, 3);

  return (
    <>
      <p className="text-sm font-medium text-zinc-900 leading-snug break-words">
        {cliente.nombre}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${ESTILO_BADGE[estado]}`}
        >
          <span className={`size-1.5 rounded-full ${PUNTO_BADGE[estado]}`} />
          {ETIQUETA_ESTADO[estado]}
        </span>
        {cliente.fechaLimite && (
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
            <CalendarDays className="size-3" />
            {formatearFecha(cliente.fechaLimite)}
          </span>
        )}
        {cliente.adjuntos.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
            <Paperclip className="size-3" />
            {cliente.adjuntos.length}
          </span>
        )}
      </div>

      {valoresVisibles.length > 0 && (
        <dl className="mt-2 space-y-0.5">
          {valoresVisibles.map((v) => (
            <div key={v.id} className="flex gap-1 text-[11px] leading-4">
              <dt className="text-zinc-400 shrink-0">{v.campo.nombre}:</dt>
              <dd
                className={`text-zinc-600 truncate ${
                  v.campo.tipo === "NUMERO" ? "tabular-nums" : ""
                }`}
              >
                {v.valor}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}

export default function Tarjeta({ cliente, diasAviso, alAbrir, arrastrando }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cliente.id, data: { tipo: "cliente" } });

  const estilo = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={estilo}
      {...attributes}
      {...listeners}
      onClick={() => alAbrir(cliente)}
      className={`animar-entrada cursor-grab rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-[box-shadow,border-color,transform] duration-150 hover:-translate-y-px hover:border-zinc-300 hover:shadow-md active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      } ${arrastrando ? "shadow-lg ring-2 ring-indigo-400/40 rotate-2" : ""}`}
    >
      <ContenidoTarjeta cliente={cliente} diasAviso={diasAviso} />
    </div>
  );
}
