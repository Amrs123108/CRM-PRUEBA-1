"use client";

import { useState, type FormEvent } from "react";
import {
  X,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type,
  Hash,
  CalendarDays,
  List,
  DollarSign,
} from "lucide-react";
import type { DefinicionCampo, TipoCampo } from "@/lib/tipos";
import { TIPOS_CAMPO, ETIQUETA_TIPO_CAMPO } from "@/lib/tipos";
import {
  crearCampo,
  actualizarCampo,
  eliminarCampo,
  moverCampo,
  contarValoresCampo,
} from "@/lib/acciones/campos";

const ICONO_TIPO: Record<TipoCampo, typeof Type> = {
  TEXTO: Type,
  NUMERO: Hash,
  FECHA: CalendarDays,
  SELECCION: List,
};

const estiloInput =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const estiloLabel = "mb-1 block text-xs font-medium text-zinc-600";

type Formulario = {
  id: string | null; // null = crear
  nombre: string;
  tipo: TipoCampo;
  opciones: string; // una por línea
  esMonetario: boolean;
};

export default function ModalCampos({
  campos,
  moduloId,
  alCerrar,
}: {
  campos: DefinicionCampo[];
  moduloId: string;
  alCerrar: () => void;
}) {
  const [form, setForm] = useState<Formulario | null>(null);
  const [eliminando, setEliminando] = useState<{
    campo: DefinicionCampo;
    valoresAfectados: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  function abrirCrear() {
    setError(null);
    setForm({ id: null, nombre: "", tipo: "TEXTO", opciones: "", esMonetario: false });
  }

  function abrirEditar(campo: DefinicionCampo) {
    setError(null);
    let opciones = "";
    try {
      opciones = campo.opciones
        ? (JSON.parse(campo.opciones) as string[]).join("\n")
        : "";
    } catch {
      opciones = "";
    }
    setForm({
      id: campo.id,
      nombre: campo.nombre,
      tipo: campo.tipo as TipoCampo,
      opciones,
      esMonetario: campo.esMonetario,
    });
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setOcupado(true);
    setError(null);
    const datos = {
      nombre: form.nombre,
      tipo: form.tipo,
      opciones: form.opciones.split("\n"),
      esMonetario: form.esMonetario,
    };
    const res = form.id
      ? await actualizarCampo(form.id, datos)
      : await crearCampo({ ...datos, moduloId });
    setOcupado(false);
    if (res.ok) setForm(null);
    else setError(res.error);
  }

  async function pedirEliminar(campo: DefinicionCampo) {
    setError(null);
    const valoresAfectados = await contarValoresCampo(campo.id);
    setEliminando({ campo, valoresAfectados });
  }

  async function confirmarEliminar() {
    if (!eliminando) return;
    setOcupado(true);
    const res = await eliminarCampo(eliminando.campo.id);
    setOcupado(false);
    if (res.ok) setEliminando(null);
    else setError(res.error);
  }

  async function mover(id: string, direccion: -1 | 1) {
    const res = await moverCampo(id, direccion);
    if (!res.ok) setError(res.error);
  }

  return (
    <div
      className="animar-fondo fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) alCerrar();
      }}
    >
      <div className="animar-modal w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">
            Campos del cliente
          </h2>
          <button
            onClick={alCerrar}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-zinc-400">
          Define qué información quieres capturar de cada cliente. Estos campos
          aparecen al crear o editar un cliente y en su tarjeta.
        </p>

        {/* Lista de campos */}
        {campos.length === 0 && !form && (
          <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-400">
            Aún no hay campos personalizados.
            <br />
            Crea el primero: por ejemplo Monto, Teléfono o Banco.
          </p>
        )}

        <ul className="space-y-1.5">
          {campos.map((campo, i) => {
            const Icono = ICONO_TIPO[campo.tipo as TipoCampo] ?? Type;
            return (
              <li
                key={campo.id}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2"
              >
                <Icono className="size-4 shrink-0 text-zinc-400" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-zinc-800">
                    {campo.nombre}
                    {campo.esMonetario && (
                      <span
                        className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                        title="Valor monetario del dashboard"
                      >
                        <DollarSign className="size-3" />
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {ETIQUETA_TIPO_CAMPO[campo.tipo as TipoCampo] ?? campo.tipo}
                  </p>
                </div>
                <button
                  onClick={() => mover(campo.id, -1)}
                  disabled={i === 0}
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                  aria-label="Subir"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  onClick={() => mover(campo.id, 1)}
                  disabled={i === campos.length - 1}
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                  aria-label="Bajar"
                >
                  <ChevronDown className="size-4" />
                </button>
                <button
                  onClick={() => abrirEditar(campo)}
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label={`Editar ${campo.nombre}`}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => pedirEliminar(campo)}
                  className="rounded-md p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Eliminar ${campo.nombre}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>

        {/* Formulario crear/editar */}
        {form ? (
          <form
            onSubmit={guardar}
            className="mt-4 space-y-3 rounded-xl bg-zinc-50 p-4"
          >
            <p className="text-sm font-medium text-zinc-800">
              {form.id ? "Editar campo" : "Nuevo campo"}
            </p>
            <div>
              <label className={estiloLabel}>Nombre *</label>
              <input
                autoFocus
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className={estiloInput}
                placeholder="Ej. Monto, Teléfono, Banco…"
              />
            </div>
            <div>
              <label className={estiloLabel}>Tipo</label>
              <div className="grid grid-cols-4 gap-1.5">
                {TIPOS_CAMPO.map((t) => {
                  const Icono = ICONO_TIPO[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, tipo: t })}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-medium ${
                        form.tipo === t
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"
                      }`}
                    >
                      <Icono className="size-4" />
                      {ETIQUETA_TIPO_CAMPO[t]}
                    </button>
                  );
                })}
              </div>
            </div>
            {form.tipo === "SELECCION" && (
              <div>
                <label className={estiloLabel}>
                  Opciones (una por línea) *
                </label>
                <textarea
                  rows={4}
                  value={form.opciones}
                  onChange={(e) =>
                    setForm({ ...form, opciones: e.target.value })
                  }
                  className={estiloInput}
                  placeholder={"Banco Uno\nBanco Dos\nBanco Tres"}
                />
              </div>
            )}
            {form.tipo === "NUMERO" && (
              <label className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={form.esMonetario}
                  onChange={(e) =>
                    setForm({ ...form, esMonetario: e.target.checked })
                  }
                  className="mt-0.5 size-4 accent-violet-600"
                />
                <span>
                  <span className="font-medium text-zinc-800">
                    Usar como valor monetario
                  </span>
                  <br />
                  <span className="text-xs text-zinc-400">
                    Este es el campo que el dashboard sumará como dinero por
                    etapa. Solo puede haber uno marcado por módulo.
                  </span>
                </span>
              </label>
            )}
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={ocupado}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {ocupado ? "Guardando…" : "Guardar campo"}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={abrirCrear}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-500 hover:border-violet-400 hover:text-violet-600"
          >
            <Plus className="size-4" /> Agregar campo
          </button>
        )}

        {/* Confirmación de eliminación */}
        {eliminando && (
          <div className="mt-4 space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">
              ¿Eliminar el campo{" "}
              <strong>{eliminando.campo.nombre}</strong>?
              {eliminando.valoresAfectados > 0 && (
                <>
                  {" "}
                  Se borrará el valor capturado en{" "}
                  <strong>{eliminando.valoresAfectados} cliente(s)</strong>.
                </>
              )}{" "}
              Esta acción no se puede deshacer.
            </p>
            {error && <p className="text-xs text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEliminando(null)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminar}
                disabled={ocupado}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {ocupado ? "Eliminando…" : "Eliminar campo"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
