import { prisma } from "@/lib/prisma";
import type { EtapaConClientes } from "@/lib/tipos";
import { estadoVencimiento } from "@/lib/semaforo";

export async function obtenerConfiguracion() {
  return prisma.configuracion.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

export async function obtenerModulos() {
  return prisma.modulo.findMany({ orderBy: { orden: "asc" } });
}

export async function obtenerTablero(
  moduloId: string
): Promise<EtapaConClientes[]> {
  return prisma.etapa.findMany({
    where: { moduloId },
    orderBy: { orden: "asc" },
    include: {
      clientes: {
        orderBy: { orden: "asc" },
        include: {
          valores: { include: { campo: true } },
          adjuntos: { orderBy: { creadoEn: "desc" } },
        },
      },
    },
  });
}

export async function obtenerCampos(moduloId: string) {
  return prisma.definicionCampo.findMany({
    where: { moduloId },
    orderBy: { orden: "asc" },
  });
}

export type EtapaDashboard = {
  id: string;
  nombre: string;
  color: string;
  clientes: number;
  monto: number;
};

type GrupoVencimiento = { clientes: number; monto: number };

export type DashboardDatos = {
  moduloId: string;
  campoMonetarioNombre: string | null;
  etapas: EtapaDashboard[];
  totalClientes: number;
  totalMonto: number;
  prospectados: number;
  vencimiento: {
    tarde: GrupoVencimiento;
    cerca: GrupoVencimiento;
    aTiempo: GrupoVencimiento;
    sinFecha: GrupoVencimiento;
  };
  meta: {
    mes: string;
    metaClientes: number;
    metaMonto: number;
    logradoClientes: number;
    logradoMonto: number;
  };
};

export function mesActual(): string {
  return new Date().toISOString().slice(0, 7); // "AAAA-MM"
}

export async function obtenerDashboard(
  moduloId: string,
  diasAviso: number
): Promise<DashboardDatos> {
  const [campos, etapas, metaFila] = await Promise.all([
    prisma.definicionCampo.findMany({ where: { moduloId } }),
    prisma.etapa.findMany({
      where: { moduloId },
      orderBy: { orden: "asc" },
      include: { clientes: { include: { valores: true } } },
    }),
    prisma.meta.findUnique({
      where: { moduloId_mes: { moduloId, mes: mesActual() } },
    }),
  ]);

  const campoMonetario = campos.find((c) => c.esMonetario) ?? null;

  function montoDeCliente(valores: { campoId: string; valor: string }[]): number {
    if (!campoMonetario) return 0;
    const v = valores.find((x) => x.campoId === campoMonetario.id);
    const n = v ? Number(v.valor) : 0;
    return Number.isFinite(n) ? n : 0;
  }

  const etapasDash: EtapaDashboard[] = etapas.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    color: e.color,
    clientes: e.clientes.length,
    monto: e.clientes.reduce((acc, c) => acc + montoDeCliente(c.valores), 0),
  }));

  const totalClientes = etapasDash.reduce((a, e) => a + e.clientes, 0);
  const totalMonto = etapasDash.reduce((a, e) => a + e.monto, 0);
  const prospectados = etapasDash[0]?.clientes ?? 0;

  const vencimiento = {
    tarde: { clientes: 0, monto: 0 },
    cerca: { clientes: 0, monto: 0 },
    aTiempo: { clientes: 0, monto: 0 },
    sinFecha: { clientes: 0, monto: 0 },
  };
  for (const e of etapas) {
    for (const c of e.clientes) {
      const estado = estadoVencimiento(c.fechaLimite, diasAviso);
      const monto = montoDeCliente(c.valores);
      const clave =
        estado === "tarde"
          ? "tarde"
          : estado === "cerca"
            ? "cerca"
            : estado === "a-tiempo"
              ? "aTiempo"
              : "sinFecha";
      vencimiento[clave].clientes += 1;
      vencimiento[clave].monto += monto;
    }
  }

  const ultimaEtapa = etapasDash[etapasDash.length - 1];

  return {
    moduloId,
    campoMonetarioNombre: campoMonetario?.nombre ?? null,
    etapas: etapasDash,
    totalClientes,
    totalMonto,
    prospectados,
    vencimiento,
    meta: {
      mes: mesActual(),
      metaClientes: metaFila?.metaClientes ?? 0,
      metaMonto: metaFila?.metaMonto ?? 0,
      logradoClientes: ultimaEtapa?.clientes ?? 0,
      logradoMonto: ultimaEtapa?.monto ?? 0,
    },
  };
}
