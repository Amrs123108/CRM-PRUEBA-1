"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  Plus,
  Settings,
  SquareKanban,
  Pencil,
  Trash2,
  Menu,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import type {
  EtapaConClientes,
  ClienteCompleto,
  DefinicionCampo,
  Modulo,
} from "@/lib/tipos";
import { moverCliente } from "@/lib/acciones/clientes";
import { moverEtapa } from "@/lib/acciones/etapas";
import Columna from "./Columna";
import { ContenidoTarjeta } from "./Tarjeta";
import {
  ModalCliente,
  ModalEtapa,
  ModalEliminarEtapa,
  ModalEliminarCliente,
  ModalConfig,
  ModalModulo,
  ModalEliminarModulo,
} from "./modales";
import ModalCampos from "./ModalCampos";
import ModalImportar from "./ModalImportar";
import PanelCliente from "./PanelCliente";

type Props = {
  modulos: Modulo[];
  moduloActivo: Modulo | null;
  etapasIniciales: EtapaConClientes[];
  diasAviso: number;
  campos: DefinicionCampo[];
};

type ModalActivo =
  | { tipo: "nuevo-cliente"; etapaId: string }
  | { tipo: "editar-cliente"; cliente: ClienteCompleto }
  | { tipo: "eliminar-cliente"; cliente: ClienteCompleto }
  | { tipo: "nueva-etapa" }
  | { tipo: "editar-etapa"; etapa: EtapaConClientes }
  | { tipo: "eliminar-etapa"; etapa: EtapaConClientes }
  | { tipo: "config" }
  | { tipo: "campos" }
  | { tipo: "importar" }
  | { tipo: "nuevo-modulo" }
  | { tipo: "renombrar-modulo"; modulo: Modulo }
  | { tipo: "eliminar-modulo"; modulo: Modulo }
  | null;

export default function Tablero({
  modulos,
  moduloActivo,
  etapasIniciales,
  diasAviso,
  campos,
}: Props) {
  const router = useRouter();
  const [columnas, setColumnas] = useState(etapasIniciales);
  const [enDrag, setEnDrag] = useState<ClienteCompleto | null>(null);
  const [snapshot, setSnapshot] = useState<EtapaConClientes[] | null>(null);
  const [modal, setModal] = useState<ModalActivo>(null);
  const [panelClienteId, setPanelClienteId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [indiceActivoMovil, setIndiceActivoMovil] = useState(0);
  const refMenuMovil = useRef<HTMLDivElement>(null);
  const refsColumna = useRef(new Map<string, HTMLDivElement>());

  // Sincroniza con los datos del servidor tras cada revalidación
  useEffect(() => setColumnas(etapasIniciales), [etapasIniciales]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  // Vuelve a la primera etapa (vista móvil) cada vez que se cambia de módulo
  useEffect(() => setIndiceActivoMovil(0), [moduloActivo?.id]);

  // Evita quedar apuntando a una etapa que ya no existe (p. ej. tras eliminarla)
  useEffect(() => {
    setIndiceActivoMovil((i) => Math.min(i, Math.max(columnas.length - 1, 0)));
  }, [columnas.length]);

  useEffect(() => {
    if (!menuMovilAbierto) return;
    const cerrar = (e: MouseEvent) => {
      if (!refMenuMovil.current?.contains(e.target as Node)) setMenuMovilAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [menuMovilAbierto]);

  // Vista móvil: una etapa a la vez con scroll horizontal por "páginas"
  function irAEtapaMovil(etapaId: string) {
    refsColumna.current
      .get(etapaId)
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  function irAEtapaRelativa(delta: 1 | -1) {
    const destino = columnas[indiceActivoMovil + delta];
    if (destino) irAEtapaMovil(destino.id);
  }

  function alScrollTablero(e: React.UIEvent<HTMLElement>) {
    const el = e.currentTarget;
    if (el.clientWidth === 0) return;
    const indice = Math.round(el.scrollLeft / el.clientWidth);
    setIndiceActivoMovil(Math.min(Math.max(indice, 0), columnas.length - 1));
  }

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function columnaDelCliente(clienteId: string) {
    return columnas.find((c) => c.clientes.some((cl) => cl.id === clienteId));
  }

  function alIniciarDrag(e: DragStartEvent) {
    const id = String(e.active.id);
    const col = columnaDelCliente(id);
    const cliente = col?.clientes.find((c) => c.id === id) ?? null;
    setEnDrag(cliente);
    setSnapshot(columnas);
  }

  // Mueve la tarjeta entre columnas mientras se arrastra (vista previa)
  function alPasarSobre(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const colActiva = columnaDelCliente(activeId);
    const colSobre = overId.startsWith("col-")
      ? columnas.find((c) => c.id === overId.slice(4))
      : columnaDelCliente(overId);

    if (!colActiva || !colSobre || colActiva.id === colSobre.id) return;

    setColumnas((prev) => {
      const origen = prev.find((c) => c.id === colActiva.id)!;
      const cliente = origen.clientes.find((c) => c.id === activeId);
      if (!cliente) return prev;

      const destino = prev.find((c) => c.id === colSobre.id)!;
      const indiceSobre = overId.startsWith("col-")
        ? destino.clientes.length
        : destino.clientes.findIndex((c) => c.id === overId);

      return prev.map((c) => {
        if (c.id === origen.id)
          return {
            ...c,
            clientes: c.clientes.filter((cl) => cl.id !== activeId),
          };
        if (c.id === destino.id) {
          const nuevos = [...c.clientes];
          nuevos.splice(
            indiceSobre === -1 ? nuevos.length : indiceSobre,
            0,
            { ...cliente, etapaId: c.id }
          );
          return { ...c, clientes: nuevos };
        }
        return c;
      });
    });
  }

  function alSoltar(e: DragEndEvent) {
    setEnDrag(null);
    const { active, over } = e;
    const activeId = String(active.id);
    const previo = snapshot;
    setSnapshot(null);

    if (!over) {
      if (previo) setColumnas(previo);
      return;
    }

    const overId = String(over.id);
    const colDestino = columnaDelCliente(activeId);
    if (!colDestino) {
      if (previo) setColumnas(previo);
      return;
    }

    // Reordenamiento dentro de la misma columna
    let finales = columnas;
    if (!overId.startsWith("col-") && overId !== activeId) {
      const colSobre = columnaDelCliente(overId);
      if (colSobre && colSobre.id === colDestino.id) {
        const desde = colDestino.clientes.findIndex((c) => c.id === activeId);
        const hasta = colDestino.clientes.findIndex((c) => c.id === overId);
        if (desde !== -1 && hasta !== -1 && desde !== hasta) {
          finales = columnas.map((c) =>
            c.id === colDestino.id
              ? { ...c, clientes: arrayMove(c.clientes, desde, hasta) }
              : c
          );
          setColumnas(finales);
        }
      }
    }

    // ¿Cambió algo respecto al inicio del drag?
    const colOrigen = previo?.find((c) =>
      c.clientes.some((cl) => cl.id === activeId)
    );
    const colFinal = finales.find((c) => c.id === colDestino.id)!;
    const idsDestino = colFinal.clientes.map((c) => c.id);
    const sinCambios =
      colOrigen?.id === colFinal.id &&
      JSON.stringify(colOrigen?.clientes.map((c) => c.id)) ===
        JSON.stringify(idsDestino);
    if (sinCambios) return;

    const idsOrigen =
      colOrigen && colOrigen.id !== colFinal.id
        ? finales.find((c) => c.id === colOrigen.id)?.clientes.map((c) => c.id)
        : undefined;

    void (async () => {
      const res = await moverCliente({
        clienteId: activeId,
        etapaDestinoId: colFinal.id,
        idsDestino,
        idsOrigen,
      });
      if (!res.ok) {
        if (previo) setColumnas(previo);
        setAviso(res.error);
      }
    })();
  }

  async function alMoverEtapa(id: string, direccion: -1 | 1) {
    const res = await moverEtapa(id, direccion);
    if (!res.ok) setAviso(res.error);
  }

  const etapasPlanas = columnas.map(({ clientes: _, ...etapa }) => etapa);

  // El panel siempre lee la versión más fresca del cliente (tras editar/subir)
  const clientePanel = panelClienteId
    ? columnas.flatMap((c) => c.clientes).find((c) => c.id === panelClienteId) ?? null
    : null;

  const pildoraBlanca =
    "flex items-center gap-2 rounded-xl border border-white/70 bg-white/90 px-4 py-2.5 text-[15px] font-medium text-zinc-800 shadow-[0_2px_8px_rgba(31,45,80,0.10)] transition hover:bg-white disabled:opacity-50";
  const pildoraMorada =
    "flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(109,40,217,0.35)] transition hover:bg-violet-700 disabled:opacity-50";

  return (
    <div className="flex h-dvh flex-col">
      {/* Barra superior sobre el degradado */}
      <header className="flex flex-wrap items-center gap-3 px-6 pb-4 pt-6 sm:px-10">
        <h1 className="mr-1 text-3xl font-bold tracking-tight text-zinc-900">
          CRM de prueba
        </h1>
        {/* En móvil, Settings y Dashboard se agrupan dentro del menú "☰" */}
        <div className="hidden sm:contents">
          <button
            onClick={() => setModal({ tipo: "config" })}
            className={pildoraBlanca}
            title="Configuración del tablero"
          >
            <Settings className="size-4.5" /> Settings
          </button>
          <Link
            href={moduloActivo ? `/dashboard?modulo=${moduloActivo.id}` : "/dashboard"}
            className={pildoraBlanca}
            title="Ver dashboard"
          >
            <LayoutDashboard className="size-4.5" /> Dashboard
          </Link>
        </div>

        {/* Módulos como píldoras */}
        {modulos.map((m) => {
          const activo = m.id === moduloActivo?.id;
          return activo ? (
            <span key={m.id} className={`${pildoraMorada} cursor-default`}>
              {m.nombre}
              <button
                onClick={() => setModal({ tipo: "renombrar-modulo", modulo: m })}
                className="ml-1 rounded p-0.5 text-white/70 hover:bg-white/20 hover:text-white"
                aria-label={`Renombrar módulo ${m.nombre}`}
                title="Renombrar módulo"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                onClick={() => setModal({ tipo: "eliminar-modulo", modulo: m })}
                className="rounded p-0.5 text-white/70 hover:bg-white/20 hover:text-white"
                aria-label={`Eliminar módulo ${m.nombre}`}
                title="Eliminar módulo"
              >
                <Trash2 className="size-3.5" />
              </button>
            </span>
          ) : (
            <Link key={m.id} href={`/?modulo=${m.id}`} className={pildoraBlanca}>
              {m.nombre}
            </Link>
          );
        })}
        <button
          onClick={() => setModal({ tipo: "nuevo-modulo" })}
          className={`${pildoraBlanca} px-3`}
          aria-label="Nuevo módulo"
          title="Nuevo módulo"
        >
          <Plus className="size-4.5" />
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="hidden sm:contents">
            <button
              onClick={() => setModal({ tipo: "campos" })}
              disabled={!moduloActivo}
              className={pildoraBlanca}
              title="Campos del cliente"
            >
              Campos
            </button>
            <button
              onClick={() => setModal({ tipo: "importar" })}
              disabled={columnas.length === 0}
              className={pildoraBlanca}
              title="Importar clientes desde Excel"
            >
              Importar Excel
            </button>
            <button
              onClick={() => setModal({ tipo: "nueva-etapa" })}
              disabled={!moduloActivo}
              className={pildoraBlanca}
            >
              Nueva etapa
            </button>
          </div>

          {/* Menú "más acciones" — solo en móvil */}
          <div className="relative sm:hidden" ref={refMenuMovil}>
            <button
              onClick={() => setMenuMovilAbierto((v) => !v)}
              className={pildoraBlanca}
              aria-label="Más acciones"
              title="Más acciones"
            >
              <Menu className="size-4.5" />
            </button>
            {menuMovilAbierto && (
              <div className="absolute right-0 z-30 mt-1 w-52 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => {
                    setMenuMovilAbierto(false);
                    setModal({ tipo: "config" });
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  <Settings className="size-4" /> Settings
                </button>
                <Link
                  href={moduloActivo ? `/dashboard?modulo=${moduloActivo.id}` : "/dashboard"}
                  onClick={() => setMenuMovilAbierto(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  <LayoutDashboard className="size-4" /> Dashboard
                </Link>
                <button
                  onClick={() => {
                    setMenuMovilAbierto(false);
                    setModal({ tipo: "campos" });
                  }}
                  disabled={!moduloActivo}
                  className="flex w-full items-center px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-40"
                >
                  Campos
                </button>
                <button
                  onClick={() => {
                    setMenuMovilAbierto(false);
                    setModal({ tipo: "importar" });
                  }}
                  disabled={columnas.length === 0}
                  className="flex w-full items-center px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-40"
                >
                  Importar Excel
                </button>
                <button
                  onClick={() => {
                    setMenuMovilAbierto(false);
                    setModal({ tipo: "nueva-etapa" });
                  }}
                  disabled={!moduloActivo}
                  className="flex w-full items-center px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-40"
                >
                  Nueva etapa
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() =>
              setModal({ tipo: "nuevo-cliente", etapaId: columnas[0]?.id ?? "" })
            }
            disabled={columnas.length === 0}
            className={pildoraMorada}
          >
            <Plus className="size-4.5" /> Nuevo cliente
          </button>
        </div>
      </header>

      {/* Tablero */}
      {!moduloActivo ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-[0_8px_24px_rgba(31,45,80,0.12)]">
            <SquareKanban className="size-7" />
          </span>
          <h2 className="text-lg font-semibold text-zinc-900">
            No hay módulos todavía
          </h2>
          <p className="max-w-sm text-sm text-zinc-600">
            Un módulo es un tablero independiente para cada proceso del negocio
            (por ejemplo: Ventas, Cobros Judiciales).
          </p>
          <button
            onClick={() => setModal({ tipo: "nuevo-modulo" })}
            className={`mt-2 ${pildoraMorada}`}
          >
            <Plus className="size-4" /> Crear primer módulo
          </button>
        </div>
      ) : columnas.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-[0_8px_24px_rgba(31,45,80,0.12)]">
            <SquareKanban className="size-7" />
          </span>
          <h2 className="text-lg font-semibold text-zinc-900">
            El módulo {moduloActivo.nombre} no tiene etapas
          </h2>
          <p className="max-w-sm text-sm text-zinc-600">
            Crea la primera etapa para empezar a organizar clientes. Las etapas
            son las columnas del tablero (por ejemplo: Prospección, Análisis,
            Aprobado).
          </p>
          <button
            onClick={() => setModal({ tipo: "nueva-etapa" })}
            className={`mt-2 ${pildoraMorada}`}
          >
            <Plus className="size-4" /> Crear primera etapa
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensores}
          collisionDetection={closestCorners}
          onDragStart={alIniciarDrag}
          onDragOver={alPasarSobre}
          onDragEnd={alSoltar}
        >
          {/* Pestañas de etapa — solo en móvil: una columna a la vez */}
          <div className="flex flex-col gap-2 px-4 pb-2 sm:hidden">
            <div className="flex items-center gap-1">
              <button
                onClick={() => irAEtapaRelativa(-1)}
                disabled={indiceActivoMovil === 0}
                className="shrink-0 rounded-lg p-1.5 text-zinc-500 disabled:opacity-30"
                aria-label="Etapa anterior"
              >
                <ChevronLeft className="size-5" />
              </button>
              <div className="flex-1 truncate text-center text-[13px] font-bold uppercase tracking-wide text-zinc-800">
                {columnas[indiceActivoMovil]?.nombre}{" "}
                <span className="font-normal normal-case text-zinc-400">
                  ({columnas[indiceActivoMovil]?.clientes.length ?? 0})
                </span>
              </div>
              <button
                onClick={() => irAEtapaRelativa(1)}
                disabled={indiceActivoMovil === columnas.length - 1}
                className="shrink-0 rounded-lg p-1.5 text-zinc-500 disabled:opacity-30"
                aria-label="Etapa siguiente"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {columnas.map((etapa, i) => (
                <button
                  key={etapa.id}
                  onClick={() => irAEtapaMovil(etapa.id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                    i === indiceActivoMovil
                      ? "bg-violet-600 text-white"
                      : "bg-white/70 text-zinc-600"
                  }`}
                >
                  {etapa.nombre}
                </button>
              ))}
            </div>
          </div>

          <main
            onScroll={alScrollTablero}
            className={`flex flex-1 gap-0 overflow-x-auto px-0 pb-8 pt-2 snap-x snap-mandatory sm:gap-6 sm:px-10 sm:pt-2 sm:snap-none ${
              enDrag ? "!snap-none" : ""
            }`}
          >
            {columnas.map((etapa, i) => (
              <div
                key={etapa.id}
                ref={(el) => {
                  if (el) refsColumna.current.set(etapa.id, el);
                  else refsColumna.current.delete(etapa.id);
                }}
                className="w-full shrink-0 snap-center px-4 sm:w-80 sm:px-0"
              >
                <Columna
                  etapa={etapa}
                  diasAviso={diasAviso}
                  esPrimera={i === 0}
                  esUltima={i === columnas.length - 1}
                  alAbrirCliente={(cliente) => setPanelClienteId(cliente.id)}
                  alNuevoCliente={(etapaId) =>
                    setModal({ tipo: "nuevo-cliente", etapaId })
                  }
                  alEditarEtapa={(et) => setModal({ tipo: "editar-etapa", etapa: et })}
                  alEliminarEtapa={(et) =>
                    setModal({ tipo: "eliminar-etapa", etapa: et })
                  }
                  alMoverEtapa={alMoverEtapa}
                />
              </div>
            ))}
          </main>

          <DragOverlay>
            {enDrag && (
              <div className="w-72 rotate-2 rounded-xl bg-white p-4 shadow-xl ring-2 ring-violet-400/50">
                <ContenidoTarjeta cliente={enDrag} diasAviso={diasAviso} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Panel de detalle del cliente */}
      {clientePanel && (
        <PanelCliente
          cliente={clientePanel}
          etapa={etapasPlanas.find((e) => e.id === clientePanel.etapaId)}
          diasAviso={diasAviso}
          alCerrar={() => setPanelClienteId(null)}
          alEditar={(cliente) => setModal({ tipo: "editar-cliente", cliente })}
          alEliminar={(cliente) => setModal({ tipo: "eliminar-cliente", cliente })}
        />
      )}

      {/* Aviso flotante de error */}
      {aviso && (
        <div className="animar-entrada fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg">
          {aviso}
        </div>
      )}

      {/* Modales */}
      {modal?.tipo === "nuevo-cliente" && (
        <ModalCliente
          cliente={null}
          etapaInicialId={modal.etapaId}
          etapas={etapasPlanas}
          campos={campos}
          alCerrar={() => setModal(null)}
        />
      )}
      {modal?.tipo === "editar-cliente" && (
        <ModalCliente
          cliente={modal.cliente}
          etapaInicialId={modal.cliente.etapaId}
          etapas={etapasPlanas}
          campos={campos}
          alCerrar={() => setModal(null)}
          alEliminar={(cliente) => setModal({ tipo: "eliminar-cliente", cliente })}
        />
      )}
      {modal?.tipo === "eliminar-cliente" && (
        <ModalEliminarCliente
          cliente={modal.cliente}
          alCerrar={() => setModal(null)}
          alEliminado={() => {
            setModal(null);
            setPanelClienteId(null);
          }}
        />
      )}
      {modal?.tipo === "nueva-etapa" && moduloActivo && (
        <ModalEtapa
          etapa={null}
          moduloId={moduloActivo.id}
          alCerrar={() => setModal(null)}
        />
      )}
      {modal?.tipo === "editar-etapa" && (
        <ModalEtapa
          etapa={modal.etapa}
          moduloId={modal.etapa.moduloId}
          alCerrar={() => setModal(null)}
        />
      )}
      {modal?.tipo === "eliminar-etapa" && (
        <ModalEliminarEtapa
          etapa={modal.etapa}
          otrasEtapas={etapasPlanas.filter((e) => e.id !== modal.etapa.id)}
          alCerrar={() => setModal(null)}
        />
      )}
      {modal?.tipo === "config" && (
        <ModalConfig diasAviso={diasAviso} alCerrar={() => setModal(null)} />
      )}
      {modal?.tipo === "campos" && moduloActivo && (
        <ModalCampos
          campos={campos}
          moduloId={moduloActivo.id}
          alCerrar={() => setModal(null)}
        />
      )}
      {modal?.tipo === "nuevo-modulo" && (
        <ModalModulo modulo={null} alCerrar={() => setModal(null)} />
      )}
      {modal?.tipo === "renombrar-modulo" && (
        <ModalModulo modulo={modal.modulo} alCerrar={() => setModal(null)} />
      )}
      {modal?.tipo === "eliminar-modulo" && (
        <ModalEliminarModulo
          modulo={modal.modulo}
          alCerrar={() => setModal(null)}
          alEliminado={() => {
            setModal(null);
            router.push("/");
          }}
        />
      )}
      {modal?.tipo === "importar" && (
        <ModalImportar
          etapas={etapasPlanas}
          campos={campos}
          alCerrar={() => setModal(null)}
        />
      )}
    </div>
  );
}
