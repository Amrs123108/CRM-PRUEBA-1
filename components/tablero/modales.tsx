"use client";

import { useState, useEffect, type ReactNode, type FormEvent } from "react";
import { X } from "lucide-react";
import type {
  ClienteCompleto,
  DefinicionCampo,
  Etapa,
  EtapaConClientes,
  TipoCampo,
} from "@/lib/tipos";
import { COLORES_ETAPA } from "@/lib/tipos";
import { crearCliente, actualizarCliente, eliminarCliente } from "@/lib/acciones/clientes";
import { crearEtapa, actualizarEtapa, eliminarEtapa } from "@/lib/acciones/etapas";
import { actualizarDiasAviso } from "@/lib/acciones/config";

// ---------- Base ----------

function Modal({
  titulo,
  alCerrar,
  children,
}: {
  titulo: string;
  alCerrar: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const conEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") alCerrar();
    };
    document.addEventListener("keydown", conEscape);
    return () => document.removeEventListener("keydown", conEscape);
  }, [alCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) alCerrar();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">{titulo}</h2>
          <button
            onClick={alCerrar}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const estiloInput =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
const estiloLabel = "mb-1 block text-xs font-medium text-zinc-600";
const estiloBotonPrimario =
  "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50";
const estiloBotonSecundario =
  "rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50";
const estiloBotonPeligro =
  "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50";

function MensajeError({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
      {mensaje}
    </p>
  );
}

// ---------- Cliente (crear / editar) ----------

function fechaAInput(fecha: Date | null): string {
  if (!fecha) return "";
  const f = new Date(fecha);
  const mes = String(f.getMonth() + 1).padStart(2, "0");
  const dia = String(f.getDate()).padStart(2, "0");
  return `${f.getFullYear()}-${mes}-${dia}`;
}

function CampoDinamico({
  campo,
  valor,
  alCambiar,
}: {
  campo: DefinicionCampo;
  valor: string;
  alCambiar: (v: string) => void;
}) {
  const tipo = campo.tipo as TipoCampo;
  if (tipo === "SELECCION") {
    let opciones: string[] = [];
    try {
      opciones = campo.opciones ? JSON.parse(campo.opciones) : [];
    } catch {
      opciones = [];
    }
    return (
      <select
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        className={estiloInput}
      >
        <option value="">— Sin valor —</option>
        {opciones.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type={tipo === "NUMERO" ? "number" : tipo === "FECHA" ? "date" : "text"}
      step={tipo === "NUMERO" ? "any" : undefined}
      value={valor}
      onChange={(e) => alCambiar(e.target.value)}
      className={estiloInput}
      placeholder={tipo === "TEXTO" ? campo.nombre : undefined}
    />
  );
}

export function ModalCliente({
  cliente,
  etapaInicialId,
  etapas,
  campos,
  alCerrar,
  alEliminar,
}: {
  cliente: ClienteCompleto | null; // null = crear
  etapaInicialId: string;
  etapas: Etapa[];
  campos: DefinicionCampo[];
  alCerrar: () => void;
  alEliminar?: (cliente: ClienteCompleto) => void;
}) {
  const [nombre, setNombre] = useState(cliente?.nombre ?? "");
  const [fecha, setFecha] = useState(fechaAInput(cliente?.fechaLimite ?? null));
  const [etapaId, setEtapaId] = useState(cliente ? cliente.etapaId : etapaInicialId);
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const iniciales: Record<string, string> = {};
    for (const v of cliente?.valores ?? []) iniciales[v.campoId] = v.valor;
    return iniciales;
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const datos = {
      nombre,
      fechaLimite: fecha || null,
      etapaId,
      valores,
    };
    const res = cliente
      ? await actualizarCliente(cliente.id, datos)
      : await crearCliente(datos);
    setGuardando(false);
    if (res.ok) alCerrar();
    else setError(res.error);
  }

  return (
    <Modal titulo={cliente ? "Editar cliente" : "Nuevo cliente"} alCerrar={alCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label className={estiloLabel}>Nombre *</label>
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={estiloInput}
            placeholder="Nombre del cliente"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={estiloLabel}>Fecha límite</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={estiloInput}
            />
          </div>
          {!cliente && (
            <div>
              <label className={estiloLabel}>Etapa</label>
              <select
                value={etapaId}
                onChange={(e) => setEtapaId(e.target.value)}
                className={estiloInput}
              >
                {etapas.map((et) => (
                  <option key={et.id} value={et.id}>
                    {et.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {campos.length > 0 && (
          <div className="space-y-3 border-t border-zinc-100 pt-3">
            {campos.map((campo) => (
              <div key={campo.id}>
                <label className={estiloLabel}>{campo.nombre}</label>
                <CampoDinamico
                  campo={campo}
                  valor={valores[campo.id] ?? ""}
                  alCambiar={(v) =>
                    setValores((prev) => ({ ...prev, [campo.id]: v }))
                  }
                />
              </div>
            ))}
          </div>
        )}

        <MensajeError mensaje={error} />

        <div className="flex items-center justify-between pt-1">
          {cliente && alEliminar ? (
            <button
              type="button"
              onClick={() => alEliminar(cliente)}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Eliminar
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={alCerrar} className={estiloBotonSecundario}>
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className={estiloBotonPrimario}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Etapa (crear / editar) ----------

export function ModalEtapa({
  etapa,
  alCerrar,
}: {
  etapa: Etapa | null; // null = crear
  alCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(etapa?.nombre ?? "");
  const [color, setColor] = useState(etapa?.color ?? COLORES_ETAPA[0]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const res = etapa
      ? await actualizarEtapa(etapa.id, { nombre, color })
      : await crearEtapa(nombre, color);
    setGuardando(false);
    if (res.ok) alCerrar();
    else setError(res.error);
  }

  return (
    <Modal titulo={etapa ? "Editar etapa" : "Nueva etapa"} alCerrar={alCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label className={estiloLabel}>Nombre *</label>
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={estiloInput}
            placeholder="Ej. Prospección, Análisis, Aprobado…"
          />
        </div>

        <div>
          <label className={estiloLabel}>Color</label>
          <div className="flex gap-2">
            {COLORES_ETAPA.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`size-7 rounded-full transition-transform hover:scale-110 ${
                  color === c ? "ring-2 ring-offset-2 ring-zinc-400" : ""
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        <MensajeError mensaje={error} />

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={alCerrar} className={estiloBotonSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className={estiloBotonPrimario}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Eliminar etapa ----------

export function ModalEliminarEtapa({
  etapa,
  otrasEtapas,
  alCerrar,
}: {
  etapa: EtapaConClientes;
  otrasEtapas: Etapa[];
  alCerrar: () => void;
}) {
  const [destinoId, setDestinoId] = useState(otrasEtapas[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const tieneClientes = etapa.clientes.length > 0;

  async function confirmar() {
    setEliminando(true);
    setError(null);
    const res = await eliminarEtapa(
      etapa.id,
      tieneClientes ? destinoId : undefined
    );
    setEliminando(false);
    if (res.ok) alCerrar();
    else setError(res.error);
  }

  return (
    <Modal titulo="Eliminar etapa" alCerrar={alCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          ¿Seguro que quieres eliminar la etapa{" "}
          <strong className="text-zinc-900">{etapa.nombre}</strong>?
        </p>

        {tieneClientes && (
          <div>
            <p className="mb-2 text-sm text-zinc-600">
              Tiene <strong>{etapa.clientes.length} cliente(s)</strong>. Elige a
              qué etapa moverlos:
            </p>
            {otrasEtapas.length === 0 ? (
              <MensajeError mensaje="No hay otra etapa disponible. Crea una etapa primero o elimina los clientes." />
            ) : (
              <select
                value={destinoId}
                onChange={(e) => setDestinoId(e.target.value)}
                className={estiloInput}
              >
                {otrasEtapas.map((et) => (
                  <option key={et.id} value={et.id}>
                    {et.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <MensajeError mensaje={error} />

        <div className="flex justify-end gap-2">
          <button onClick={alCerrar} className={estiloBotonSecundario}>
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={eliminando || (tieneClientes && otrasEtapas.length === 0)}
            className={estiloBotonPeligro}
          >
            {eliminando ? "Eliminando…" : "Eliminar etapa"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Eliminar cliente ----------

export function ModalEliminarCliente({
  cliente,
  alCerrar,
  alEliminado,
}: {
  cliente: ClienteCompleto;
  alCerrar: () => void;
  alEliminado: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);

  async function confirmar() {
    setEliminando(true);
    setError(null);
    const res = await eliminarCliente(cliente.id);
    setEliminando(false);
    if (res.ok) alEliminado();
    else setError(res.error);
  }

  return (
    <Modal titulo="Eliminar cliente" alCerrar={alCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          ¿Seguro que quieres eliminar a{" "}
          <strong className="text-zinc-900">{cliente.nombre}</strong>? Se
          eliminarán también sus datos y adjuntos. Esta acción no se puede
          deshacer.
        </p>
        <MensajeError mensaje={error} />
        <div className="flex justify-end gap-2">
          <button onClick={alCerrar} className={estiloBotonSecundario}>
            Cancelar
          </button>
          <button onClick={confirmar} disabled={eliminando} className={estiloBotonPeligro}>
            {eliminando ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Configuración ----------

export function ModalConfig({
  diasAviso,
  alCerrar,
}: {
  diasAviso: number;
  alCerrar: () => void;
}) {
  const [dias, setDias] = useState(String(diasAviso));
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const res = await actualizarDiasAviso(Number(dias));
    setGuardando(false);
    if (res.ok) alCerrar();
    else setError(res.error);
  }

  return (
    <Modal titulo="Configuración del tablero" alCerrar={alCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label className={estiloLabel}>
            Días de aviso para &ldquo;Cerca de vencer&rdquo;
          </label>
          <input
            type="number"
            min={0}
            max={365}
            value={dias}
            onChange={(e) => setDias(e.target.value)}
            className={estiloInput}
          />
          <p className="mt-1.5 text-xs text-zinc-400">
            Un cliente se marca &ldquo;Cerca de vencer&rdquo; cuando faltan
            estos días (o menos) para su fecha límite. Si la fecha ya pasó, se
            marca &ldquo;Tarde&rdquo;.
          </p>
        </div>
        <MensajeError mensaje={error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={alCerrar} className={estiloBotonSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className={estiloBotonPrimario}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
