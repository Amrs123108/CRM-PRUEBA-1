import { prisma } from "@/lib/prisma";
import type { EtapaConClientes } from "@/lib/tipos";

export async function obtenerConfiguracion() {
  return prisma.configuracion.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

export async function obtenerTablero(): Promise<EtapaConClientes[]> {
  return prisma.etapa.findMany({
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

export async function obtenerCampos() {
  return prisma.definicionCampo.findMany({ orderBy: { orden: "asc" } });
}
