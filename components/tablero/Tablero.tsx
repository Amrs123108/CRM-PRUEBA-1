"use client";

import { useEffect, useState } from "react";
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
import { Plus, Settings, SquareKanban, SlidersHorizontal } from "lucide-react";
import type {
  EtapaConClientes,
  ClienteCompleto,
  DefinicionCampo,
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
} from "./modales";
import ModalCampos from "./ModalCampos";

type Props = {
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
  | null;

export default function Tablero({ etapasIniciales, diasAviso, campos }: Props) {
  const [columnas, setColumnas] = useState(etapasIniciales);
  const [enDrag, setEnDrag] = useState<ClienteCompleto | null>(null);
  const [snapshot, setSnapshot] = useState<EtapaConClientes[] | null>(null);
  const [modal, setModal] = useState<ModalActivo>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Sincroniza con los datos del servidor tras cada revalidación
  useEffect(() => setColumnas(etapasIniciales), [etapasIniciales]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

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

  return (
    <div className="flex h-dvh flex-col bg-zinc-50">
      {/* Barra superior */}
      <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <SquareKanban className="size-4.5" />
        </span>
        <div className="mr-auto">
          <h1 className="text-sm font-semibold text-zinc-900 leading-tight">
            CRM de prueba
          </h1>
          <p className="text-xs text-zinc-400 leading-tight">
            Tablero de clientes · V1
          </p>
        </div>

        <button
          onClick={() => setModal({ tipo: "config" })}
          className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
          aria-label="Configuración"
        >
          <Settings className="size-4" />
        </button>
        <button
          onClick={() => setModal({ tipo: "campos" })}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <SlidersHorizontal className="size-4" /> Campos
        </button>
        <button
          onClick={() => setModal({ tipo: "nueva-etapa" })}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Nueva etapa
        </button>
        <button
          onClick={() =>
            setModal({ tipo: "nuevo-cliente", etapaId: columnas[0]?.id ?? "" })
          }
          disabled={columnas.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="size-4" /> Nuevo cliente
        </button>
      </header>

      {/* Tablero */}
      {columnas.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <SquareKanban className="size-7" />
          </span>
          <h2 className="text-lg font-semibold text-zinc-900">
            Tu tablero está vacío
          </h2>
          <p className="max-w-sm text-sm text-zinc-500">
            Crea tu primera etapa para empezar a organizar clientes. Las etapas
            son las columnas del tablero (por ejemplo: Prospección, Análisis,
            Aprobado).
          </p>
          <button
            onClick={() => setModal({ tipo: "nueva-etapa" })}
            className="mt-2 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
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
          <main className="flex flex-1 gap-3 overflow-x-auto p-4">
            {columnas.map((etapa, i) => (
              <Columna
                key={etapa.id}
                etapa={etapa}
                diasAviso={diasAviso}
                esPrimera={i === 0}
                esUltima={i === columnas.length - 1}
                alAbrirCliente={(cliente) =>
                  setModal({ tipo: "editar-cliente", cliente })
                }
                alNuevoCliente={(etapaId) =>
                  setModal({ tipo: "nuevo-cliente", etapaId })
                }
                alEditarEtapa={(et) => setModal({ tipo: "editar-etapa", etapa: et })}
                alEliminarEtapa={(et) =>
                  setModal({ tipo: "eliminar-etapa", etapa: et })
                }
                alMoverEtapa={alMoverEtapa}
              />
            ))}
          </main>

          <DragOverlay>
            {enDrag && (
              <div className="w-64 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg ring-2 ring-indigo-400/40 rotate-2">
                <ContenidoTarjeta cliente={enDrag} diasAviso={diasAviso} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Aviso flotante de error */}
      {aviso && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg">
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
          alEliminado={() => setModal(null)}
        />
      )}
      {modal?.tipo === "nueva-etapa" && (
        <ModalEtapa etapa={null} alCerrar={() => setModal(null)} />
      )}
      {modal?.tipo === "editar-etapa" && (
        <ModalEtapa etapa={modal.etapa} alCerrar={() => setModal(null)} />
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
      {modal?.tipo === "campos" && (
        <ModalCampos campos={campos} alCerrar={() => setModal(null)} />
      )}
    </div>
  );
}
