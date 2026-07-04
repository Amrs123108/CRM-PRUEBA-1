"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ClienteCompleto } from "@/lib/tipos";
import {
  estadoVencimiento,
  ETIQUETA_ESTADO,
  type EstadoVencimiento,
} from "@/lib/semaforo";

// Badges sólidos con texto blanco, como en la referencia visual
const ESTILO_BADGE: Record<EstadoVencimiento, string> = {
  tarde: "bg-red-500",
  cerca: "bg-amber-500",
  "a-tiempo": "bg-emerald-500",
  "sin-fecha": "bg-zinc-400",
};

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
      <div className="mb-1 flex justify-end">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm ${ESTILO_BADGE[estado]}`}
        >
          {ETIQUETA_ESTADO[estado]}
        </span>
      </div>

      <p className="text-[15px] font-bold leading-snug text-zinc-900 break-words">
        {cliente.nombre}
      </p>

      {valoresVisibles.length > 0 && (
        <dl className="mt-1.5 space-y-0.5">
          {valoresVisibles.map((v) => (
            <div key={v.id} className="flex gap-1 text-[13px] leading-5">
              <dt className="shrink-0 text-zinc-500">{v.campo.nombre}:</dt>
              <dd
                className={`truncate text-zinc-600 ${
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
      className={`animar-entrada cursor-grab rounded-xl bg-white p-4 shadow-[0_2px_10px_rgba(31,45,80,0.08)] transition-[box-shadow,transform] duration-150 hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(31,45,80,0.14)] active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      } ${arrastrando ? "shadow-xl ring-2 ring-violet-400/50 rotate-2" : ""}`}
    >
      <ContenidoTarjeta cliente={cliente} diasAviso={diasAviso} />
    </div>
  );
}
