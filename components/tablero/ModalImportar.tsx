"use client";

import { useState, useRef } from "react";
import {
  X,
  FileSpreadsheet,
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { DefinicionCampo, Etapa, TipoCampo } from "@/lib/tipos";
import { TIPOS_CAMPO, ETIQUETA_TIPO_CAMPO } from "@/lib/tipos";
import {
  analizarExcel,
  importarClientes,
  type DestinoColumna,
} from "@/lib/acciones/importar";

const estiloInput =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const estiloLabel = "mb-1 block text-xs font-medium text-zinc-600";
const estiloBotonPrimario =
  "flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50";
const estiloBotonSecundario =
  "flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50";

// Selección por columna en la UI (se traduce a DestinoColumna al importar)
type SeleccionColumna = {
  valor: string; // "ignorar" | "nombre" | "fechaLimite" | "campo:{id}" | "nuevo"
  nuevoNombre: string;
  nuevoTipo: TipoCampo;
};

type Paso =
  | { n: 1 }
  | { n: 2; columnas: string[]; filas: string[][]; total: number }
  | { n: 3; creados: number; advertencias: string[] };

export default function ModalImportar({
  etapas,
  campos,
  alCerrar,
}: {
  etapas: Etapa[];
  campos: DefinicionCampo[];
  alCerrar: () => void;
}) {
  const [paso, setPaso] = useState<Paso>({ n: 1 });
  const [selecciones, setSelecciones] = useState<SeleccionColumna[]>([]);
  const [etapaId, setEtapaId] = useState(etapas[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const refArchivo = useRef<HTMLInputElement>(null);

  async function alSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setOcupado(true);
    setError(null);
    const fd = new FormData();
    fd.set("archivo", archivo);
    const res = await analizarExcel(fd);
    setOcupado(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    // Pre-mapeo inteligente: detecta "nombre" y "fecha" por el encabezado
    setSelecciones(
      res.columnas.map((col) => {
        const c = col.toLowerCase();
        let valor = "ignorar";
        if (c.includes("nombre") || c.includes("cliente")) valor = "nombre";
        else if (c.includes("fecha") || c.includes("límite") || c.includes("limite") || c.includes("vence"))
          valor = "fechaLimite";
        else {
          const existente = campos.find(
            (campo) => campo.nombre.toLowerCase() === c
          );
          valor = existente ? `campo:${existente.id}` : "nuevo";
        }
        return { valor, nuevoNombre: col, nuevoTipo: "TEXTO" as TipoCampo };
      })
    );
    setPaso({ n: 2, columnas: res.columnas, filas: res.filas, total: res.total });
  }

  // Solo puede haber un "nombre" y una "fechaLimite": al elegirlo en una
  // columna se libera en las demás
  function cambiarSeleccion(indice: number, valor: string) {
    setSelecciones((prev) =>
      prev.map((s, i) => {
        if (i === indice) return { ...s, valor };
        if (
          (valor === "nombre" || valor === "fechaLimite") &&
          s.valor === valor
        )
          return { ...s, valor: "ignorar" };
        return s;
      })
    );
  }

  async function importar() {
    if (paso.n !== 2) return;
    setOcupado(true);
    setError(null);

    const destinos: DestinoColumna[] = selecciones.map((s) => {
      if (s.valor === "nombre") return { tipo: "nombre" };
      if (s.valor === "fechaLimite") return { tipo: "fechaLimite" };
      if (s.valor === "nuevo")
        return {
          tipo: "nuevo-campo",
          nombre: s.nuevoNombre,
          tipoCampo: s.nuevoTipo,
        };
      if (s.valor.startsWith("campo:"))
        return { tipo: "campo", campoId: s.valor.slice(6) };
      return { tipo: "ignorar" };
    });

    const res = await importarClientes({ etapaId, destinos, filas: paso.filas });
    setOcupado(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPaso({ n: 3, creados: res.creados, advertencias: res.advertencias });
  }

  return (
    <div
      className="animar-fondo fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) alCerrar();
      }}
    >
      <div className="animar-modal w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <FileSpreadsheet className="size-5 text-emerald-600" />
            Importar clientes desde Excel
          </h2>
          <button
            onClick={alCerrar}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Paso 1: archivo */}
        {paso.n === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              Sube un archivo <strong>.xlsx</strong> donde la primera fila
              tenga los encabezados de columna. En el siguiente paso decides
              qué columna va a qué dato del cliente.
            </p>
            <button
              onClick={() => refArchivo.current?.click()}
              disabled={ocupado}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 px-4 py-10 text-zinc-500 hover:border-violet-400 hover:text-violet-600 disabled:opacity-50"
            >
              <Upload className="size-6" />
              <span className="text-sm font-medium">
                {ocupado ? "Leyendo archivo…" : "Elegir archivo .xlsx"}
              </span>
              <span className="text-xs text-zinc-400">Máximo 500 filas por importación</span>
            </button>
            <input
              ref={refArchivo}
              type="file"
              accept=".xlsx"
              onChange={alSeleccionarArchivo}
              className="hidden"
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
            )}
          </div>
        )}

        {/* Paso 2: mapeo */}
        {paso.n === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-600">
                <strong>{paso.total}</strong> fila(s) detectadas. Asigna cada
                columna:
              </p>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-zinc-600">Etapa destino</label>
                <select
                  value={etapaId}
                  onChange={(e) => setEtapaId(e.target.value)}
                  className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                >
                  {etapas.map((et) => (
                    <option key={et.id} value={et.id}>{et.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              {paso.columnas.map((col, i) => {
                const sel = selecciones[i];
                const ejemplo = paso.filas.find((f) => f[i]?.trim())?.[i] ?? "—";
                return (
                  <div key={i} className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-800">{col}</p>
                        <p className="truncate text-[11px] text-zinc-400">Ejemplo: {ejemplo}</p>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-zinc-300" />
                      <select
                        value={sel.valor}
                        onChange={(e) => cambiarSeleccion(i, e.target.value)}
                        className="w-52 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                      >
                        <option value="ignorar">Ignorar columna</option>
                        <option value="nombre">Nombre del cliente *</option>
                        <option value="fechaLimite">Fecha límite</option>
                        {campos.length > 0 && (
                          <optgroup label="Campos existentes">
                            {campos.map((c) => (
                              <option key={c.id} value={`campo:${c.id}`}>{c.nombre}</option>
                            ))}
                          </optgroup>
                        )}
                        <option value="nuevo">+ Crear campo nuevo</option>
                      </select>
                    </div>
                    {sel.valor === "nuevo" && (
                      <div className="mt-2 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-2">
                        <div>
                          <label className={estiloLabel}>Nombre del campo</label>
                          <input
                            value={sel.nuevoNombre}
                            onChange={(e) =>
                              setSelecciones((prev) =>
                                prev.map((s, j) =>
                                  j === i ? { ...s, nuevoNombre: e.target.value } : s
                                )
                              )
                            }
                            className={estiloInput}
                          />
                        </div>
                        <div>
                          <label className={estiloLabel}>Tipo</label>
                          <select
                            value={sel.nuevoTipo}
                            onChange={(e) =>
                              setSelecciones((prev) =>
                                prev.map((s, j) =>
                                  j === i
                                    ? { ...s, nuevoTipo: e.target.value as TipoCampo }
                                    : s
                                )
                              )
                            }
                            className={estiloInput}
                          >
                            {TIPOS_CAMPO.filter((t) => t !== "SELECCION").map((t) => (
                              <option key={t} value={t}>{ETIQUETA_TIPO_CAMPO[t]}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
            )}

            <div className="flex justify-between">
              <button onClick={() => { setPaso({ n: 1 }); setError(null); }} className={estiloBotonSecundario}>
                <ArrowLeft className="size-4" /> Otro archivo
              </button>
              <button onClick={importar} disabled={ocupado} className={estiloBotonPrimario}>
                {ocupado ? "Importando…" : `Importar ${paso.total} cliente(s)`}
                {!ocupado && <ArrowRight className="size-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: resultado */}
        {paso.n === 3 && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="size-10 text-emerald-500" />
              <p className="text-base font-semibold text-zinc-900">
                {paso.creados} cliente(s) importados
              </p>
              <p className="text-sm text-zinc-500">Ya están en el tablero.</p>
            </div>
            {paso.advertencias.length > 0 && (
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                  <AlertTriangle className="size-3.5" />
                  {paso.advertencias.length} advertencia(s)
                </p>
                <ul className="max-h-32 space-y-0.5 overflow-y-auto text-xs text-amber-700">
                  {paso.advertencias.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={alCerrar} className={estiloBotonPrimario}>Listo</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
