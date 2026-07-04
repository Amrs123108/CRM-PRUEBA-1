import { prisma } from "@/lib/prisma";
import type { EtapaConClientes } from "@/lib/tipos";

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
