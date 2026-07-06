"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Target,
  UserPlus,
  Users,
  Wallet,
  Trophy,
  LayoutDashboard,
} from "lucide-react";
import type { Modulo } from "@/lib/tipos";
import type { DashboardDatos } from "@/lib/datos";
import { formatoMonto } from "@/lib/formato";
import { TarjetaBento, TarjetaEstadistica } from "./TarjetaBento";
import Embudo from "./Embudo";
import BarrasDinero from "./BarrasDinero";
import Velocimetro from "./Velocimetro";
import Vencimiento from "./Vencimiento";
import ModalMeta from "./ModalMeta";

type Props = {
  modulos: Modulo[];
  moduloActivo: Modulo | null;
  datos: DashboardDatos | null;
};

export default function Dashboard({ modulos, moduloActivo, datos }: Props) {
  const [editandoMeta, setEditandoMeta] = useState(false);

  const pildoraBlanca =
    "flex items-center gap-2 rounded-xl border border-white/70 bg-white/90 px-4 py-2.5 text-[15px] font-medium text-zinc-800 shadow-[0_2px_8px_rgba(31,45,80,0.10)] transition hover:bg-white disabled:opacity-50";
  const pildoraMorada =
    "flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(109,40,217,0.35)] transition hover:bg-violet-700 disabled:opacity-50";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-3 px-6 pb-4 pt-6 sm:px-10">
        <Link
          href={moduloActivo ? `/?modulo=${moduloActivo.id}` : "/"}
          className={pildoraBlanca}
          title="Volver al tablero"
        >
          <ArrowLeft className="size-4.5" /> Tablero
        </Link>
        <h1 className="mr-1 flex items-center gap-2 text-3xl font-bold tracking-tight text-zinc-900">
          <LayoutDashboard className="size-7 text-violet-600" /> Dashboard
        </h1>

        {modulos.map((m) => {
          const activo = m.id === moduloActivo?.id;
          return (
            <Link
              key={m.id}
              href={`/dashboard?modulo=${m.id}`}
              className={activo ? `${pildoraMorada} cursor-default` : pildoraBlanca}
            >
              {m.nombre}
            </Link>
          );
        })}

        {moduloActivo && (
          <button
            onClick={() => setEditandoMeta(true)}
            className={`${pildoraMorada} ml-auto`}
          >
            <Target className="size-4.5" /> Editar meta
          </button>
        )}
      </header>

      {!moduloActivo || !datos ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-[0_8px_24px_rgba(31,45,80,0.12)]">
            <LayoutDashboard className="size-7" />
          </span>
          <h2 className="text-lg font-semibold text-zinc-900">
            No hay módulos todavía
          </h2>
          <p className="max-w-sm text-sm text-zinc-600">
            Crea un módulo desde el tablero para ver sus métricas aquí.
          </p>
        </div>
      ) : (
        <main className="grid flex-1 auto-rows-[minmax(150px,auto)] grid-cols-1 gap-5 px-6 pb-10 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
          <TarjetaEstadistica
            etiqueta="Clientes prospectados"
            valor={String(datos.prospectados)}
            subtexto={datos.etapas[0]?.nombre}
            icono={UserPlus}
            colorIcono="bg-sky-100 text-sky-600"
          />
          <TarjetaEstadistica
            etiqueta="Clientes totales en el CRM"
            valor={String(datos.totalClientes)}
            subtexto={moduloActivo.nombre}
            icono={Users}
            colorIcono="bg-violet-100 text-violet-600"
          />
          <TarjetaEstadistica
            etiqueta="Monto total en pipeline"
            valor={formatoMonto(datos.totalMonto)}
            subtexto={datos.campoMonetarioNombre ?? "Sin campo monetario"}
            icono={Wallet}
            colorIcono="bg-emerald-100 text-emerald-600"
          />
          <TarjetaEstadistica
            etiqueta="Clientes en última etapa"
            valor={String(datos.meta.logradoClientes)}
            subtexto={datos.etapas[datos.etapas.length - 1]?.nombre}
            icono={Trophy}
            colorIcono="bg-amber-100 text-amber-600"
          />

          <TarjetaBento
            titulo="Embudo de clientes por etapa"
            className="sm:col-span-2 sm:row-span-2"
          >
            <Embudo etapas={datos.etapas} />
          </TarjetaBento>
          <TarjetaBento
            titulo="Dinero por etapa"
            className="sm:col-span-2 sm:row-span-2"
          >
            <BarrasDinero
              etapas={datos.etapas}
              campoMonetarioNombre={datos.campoMonetarioNombre}
            />
          </TarjetaBento>

          <TarjetaBento titulo="Meta de clientes del mes">
            <Velocimetro
              titulo="Clientes en última etapa"
              logrado={datos.meta.logradoClientes}
              meta={datos.meta.metaClientes}
              formato={(n) => String(n)}
            />
          </TarjetaBento>
          <TarjetaBento titulo="Meta de monto del mes">
            <Velocimetro
              titulo="Monto logrado"
              logrado={datos.meta.logradoMonto}
              meta={datos.meta.metaMonto}
              formato={formatoMonto}
            />
          </TarjetaBento>
          <TarjetaBento titulo="Vencimiento" className="sm:col-span-2">
            <Vencimiento datos={datos.vencimiento} />
          </TarjetaBento>
        </main>
      )}

      {editandoMeta && moduloActivo && datos && (
        <ModalMeta
          moduloId={moduloActivo.id}
          moduloNombre={moduloActivo.nombre}
          mes={datos.meta.mes}
          metaClientes={datos.meta.metaClientes}
          metaMonto={datos.meta.metaMonto}
          alCerrar={() => setEditandoMeta(false)}
        />
      )}
    </div>
  );
}
