"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Resultado } from "@/lib/acciones/etapas";

const esquemaNombre = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(120, "El nombre no puede superar 120 caracteres");

// Fecha "YYYY-MM-DD" del input date → Date local (medianoche), o null
const esquemaFecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .nullable();

function parsearFecha(fecha: string | null): Date | null {
  if (!fecha) return null;
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(a, m - 1, d);
}

export type DatosCliente = {
  nombre: string;
  fechaLimite: string | null;
  etapaId: string;
  // Valores de campos dinámicos: campoId → valor (texto plano)
  valores?: Record<string, string>;
};

export async function crearCliente(datos: DatosCliente): Promise<Resultado> {
  const n = esquemaNombre.safeParse(datos.nombre);
  if (!n.success) return { ok: false, error: n.error.issues[0].message };
  const f = esquemaFecha.safeParse(datos.fechaLimite);
  if (!f.success) return { ok: false, error: f.error.issues[0].message };

  const etapa = await prisma.etapa.findUnique({ where: { id: datos.etapaId } });
  if (!etapa) return { ok: false, error: "La etapa seleccionada no existe" };

  const max = await prisma.cliente.aggregate({
    where: { etapaId: datos.etapaId },
    _max: { orden: true },
  });

  const valores = Object.entries(datos.valores ?? {}).filter(
    ([, v]) => v.trim() !== ""
  );

  await prisma.cliente.create({
    data: {
      nombre: n.data,
      fechaLimite: parsearFecha(f.data),
      etapaId: datos.etapaId,
      orden: (max._max.orden ?? -1) + 1,
      valores: {
        create: valores.map(([campoId, valor]) => ({ campoId, valor })),
      },
    },
  });
  revalidatePath("/");
  return { ok: true };
}

export async function actualizarCliente(
  id: string,
  datos: Omit<DatosCliente, "etapaId">
): Promise<Resultado> {
  const n = esquemaNombre.safeParse(datos.nombre);
  if (!n.success) return { ok: false, error: n.error.issues[0].message };
  const f = esquemaFecha.safeParse(datos.fechaLimite);
  if (!f.success) return { ok: false, error: f.error.issues[0].message };

  const existe = await prisma.cliente.findUnique({ where: { id } });
  if (!existe) return { ok: false, error: "El cliente no existe" };

  const valores = Object.entries(datos.valores ?? {});

  await prisma.$transaction([
    prisma.cliente.update({
      where: { id },
      data: { nombre: n.data, fechaLimite: parsearFecha(f.data) },
    }),
    // Upsert de cada valor; los vacíos se eliminan
    ...valores.map(([campoId, valor]) =>
      valor.trim() === ""
        ? prisma.valorCampo.deleteMany({ where: { clienteId: id, campoId } })
        : prisma.valorCampo.upsert({
            where: { clienteId_campoId: { clienteId: id, campoId } },
            update: { valor },
            create: { clienteId: id, campoId, valor },
          })
    ),
  ]);
  revalidatePath("/");
  return { ok: true };
}

// Movimiento de tarjeta en el Kanban. Recibe el orden final de la columna
// destino (y de la de origen si es distinta) y persiste los índices.
export async function moverCliente(datos: {
  clienteId: string;
  etapaDestinoId: string;
  idsDestino: string[];
  idsOrigen?: string[];
}): Promise<Resultado> {
  const cliente = await prisma.cliente.findUnique({
    where: { id: datos.clienteId },
  });
  if (!cliente) return { ok: false, error: "El cliente no existe" };

  await prisma.$transaction([
    prisma.cliente.update({
      where: { id: datos.clienteId },
      data: { etapaId: datos.etapaDestinoId },
    }),
    ...datos.idsDestino.map((id, indice) =>
      prisma.cliente.update({ where: { id }, data: { orden: indice } })
    ),
    ...(datos.idsOrigen ?? []).map((id, indice) =>
      prisma.cliente.update({ where: { id }, data: { orden: indice } })
    ),
  ]);
  revalidatePath("/");
  return { ok: true };
}

export async function eliminarCliente(id: string): Promise<Resultado> {
  const existe = await prisma.cliente.findUnique({ where: { id } });
  if (!existe) return { ok: false, error: "El cliente no existe" };
  await prisma.cliente.delete({ where: { id } });
  revalidatePath("/");
  return { ok: true };
}
