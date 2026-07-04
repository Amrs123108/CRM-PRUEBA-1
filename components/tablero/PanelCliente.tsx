"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Pencil,
  Trash2,
  CalendarDays,
  Paperclip,
  Upload,
  FileText,
  ExternalLink,
} from "lucide-react";
import type { ClienteCompleto, Etapa } from "@/lib/tipos";
import {
  estadoVencimiento,
  ETIQUETA_ESTADO,
  type EstadoVencimiento,
} from "@/lib/semaforo";
import { subirAdjunto, eliminarAdjunto } from "@/lib/acciones/adjuntos";

// Badges sólidos, como en la referencia visual
const ESTILO_BADGE: Record<EstadoVencimiento, string> = {
  tarde: "bg-red-500",
  cerca: "bg-amber-500",
  "a-tiempo": "bg-emerald-500",
  "sin-fecha": "bg-zinc-400",
};

function formatearFecha(fecha: Date): string {
  return new Date(fecha).toLocaleDateString("es", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  cliente: ClienteCompleto;
  etapa: Etapa | undefined;
  diasAviso: number;
  alCerrar: () => void;
  alEditar: (cliente: ClienteCompleto) => void;
  alEliminar: (cliente: ClienteCompleto) => void;
};

export default function PanelCliente({
  cliente,
  etapa,
  diasAviso,
  alCerrar,
  alEditar,
  alEliminar,
}: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refArchivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const conEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") alCerrar();
    };
    document.addEventListener("keydown", conEscape);
    return () => document.removeEventListener("keydown", conEscape);
  }, [alCerrar]);

  const estado = estadoVencimiento(
    cliente.fechaLimite ? new Date(cliente.fechaLimite) : null,
    diasAviso
  );
  const imagenes = cliente.adjuntos.filter((a) => a.tipoMime.startsWith("image/"));
  const documentos = cliente.adjuntos.filter((a) => !a.tipoMime.startsWith("image/"));

  async function alSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a subir el mismo archivo
    if (!archivo) return;
    setSubiendo(true);
    setError(null);
    const fd = new FormData();
    fd.set("clienteId", cliente.id);
    fd.set("archivo", archivo);
    const res = await subirAdjunto(fd);
    setSubiendo(false);
    if (!res.ok) setError(res.error);
  }

  async function alEliminarAdjunto(id: string) {
    setError(null);
    const res = await eliminarAdjunto(id);
    if (!res.ok) setError(res.error);
  }

  return (
    <>
      {/* Fondo */}
      <div
        className="animar-fondo fixed inset-0 z-40 bg-zinc-900/30 backdrop-blur-[2px]"
        onClick={alCerrar}
      />

      {/* Panel */}
      <aside className="animar-panel fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-start gap-3 border-b border-zinc-100 p-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-900 break-words">
              {cliente.nombre}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {etapa && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: etapa.color }}
                  />
                  {etapa.nombre}
                </span>
              )}
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm ${ESTILO_BADGE[estado]}`}
              >
                {ETIQUETA_ESTADO[estado]}
              </span>
            </div>
          </div>
          <button
            onClick={() => alEditar(cliente)}
            className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
            aria-label="Editar cliente"
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={() => alEliminar(cliente)}
            className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600"
            aria-label="Eliminar cliente"
          >
            <Trash2 className="size-4" />
          </button>
          <button
            onClick={alCerrar}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar panel"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Datos */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Información
            </h3>
            <dl className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <dt className="flex items-center gap-1.5 w-32 shrink-0 text-zinc-500">
                  <CalendarDays className="size-3.5" /> Fecha límite
                </dt>
                <dd className="text-zinc-800">
                  {cliente.fechaLimite
                    ? formatearFecha(cliente.fechaLimite)
                    : "Sin fecha"}
                </dd>
              </div>
              {cliente.valores.map((v) => (
                <div key={v.id} className="flex items-start gap-2 text-sm">
                  <dt className="w-32 shrink-0 text-zinc-500 truncate pt-0">
                    {v.campo.nombre}
                  </dt>
                  <dd className="text-zinc-800 break-words min-w-0">
                    {v.valor}
                  </dd>
                </div>
              ))}
              {cliente.valores.length === 0 && (
                <p className="text-sm text-zinc-400">
                  Sin datos adicionales capturados.
                </p>
              )}
            </dl>
          </section>

          {/* Adjuntos */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                <Paperclip className="size-3.5" /> Adjuntos (
                {cliente.adjuntos.length})
              </h3>
              <button
                onClick={() => refArchivo.current?.click()}
                disabled={subiendo}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                <Upload className="size-3.5" />
                {subiendo ? "Subiendo…" : "Subir archivo"}
              </button>
              <input
                ref={refArchivo}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                onChange={alSeleccionarArchivo}
                className="hidden"
              />
            </div>

            {error && (
              <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}

            {cliente.adjuntos.length === 0 && (
              <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-400">
                Sin adjuntos. Sube imágenes (JPG, PNG, WebP, GIF) o PDF de
                hasta 8 MB.
              </p>
            )}

            {/* Galería de imágenes */}
            {imagenes.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {imagenes.map((img) => (
                  <div key={img.id} className="group relative">
                    <a href={img.url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.nombre}
                        className="aspect-square w-full rounded-lg border border-zinc-200 object-cover"
                      />
                    </a>
                    <button
                      onClick={() => alEliminarAdjunto(img.id)}
                      className="absolute right-1 top-1 hidden rounded-md bg-zinc-900/70 p-1 text-white group-hover:block"
                      aria-label={`Eliminar ${img.nombre}`}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Documentos */}
            {documentos.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {documentos.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2"
                  >
                    <FileText className="size-4 shrink-0 text-zinc-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-zinc-800">
                        {doc.nombre}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {formatearTamano(doc.tamano)}
                      </p>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                      aria-label={`Abrir ${doc.nombre}`}
                    >
                      <ExternalLink className="size-4" />
                    </a>
                    <button
                      onClick={() => alEliminarAdjunto(doc.id)}
                      className="rounded-md p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Eliminar ${doc.nombre}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}
