"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { eliminarArchivo } from "@/lib/almacenamiento";
import type { Resultado } from "@/lib/acciones/etapas";

const esquemaNombre = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(60, "El nombre no puede superar 60 caracteres");

export async function crearModulo(nombre: string): Promise<Resultado> {
  const n = esquemaNombre.safeParse(nombre);
  if (!n.success) return { ok: false, error: n.error.issues[0].message };

  const max = await prisma.modulo.aggregate({ _max: { orden: true } });
  await prisma.modulo.create({
    data: { nombre: n.data, orden: (max._max.orden ?? -1) + 1 },
  });
  revalidatePath("/");
  return { ok: true };
}

export async function renombrarModulo(
  id: string,
  nombre: string
): Promise<Resultado> {
  const n = esquemaNombre.safeParse(nombre);
  if (!n.success) return { ok: false, error: n.error.issues[0].message };

  const existe = await prisma.modulo.findUnique({ where: { id } });
  if (!existe) return { ok: false, error: "El módulo no existe" };

  await prisma.modulo.update({ where: { id }, data: { nombre: n.data } });
  revalidatePath("/");
  return { ok: true };
}

// Cuántas etapas y clientes se perderían al eliminar (para avisar antes)
export async function contarContenidoModulo(
  id: string
): Promise<{ etapas: number; clientes: number }> {
  const [etapas, clientes] = await Promise.all([
    prisma.etapa.count({ where: { moduloId: id } }),
    prisma.cliente.count({ where: { etapa: { moduloId: id } } }),
  ]);
  return { etapas, clientes };
}

// Elimina el módulo con TODO su contenido (etapas, clientes, valores,
// adjuntos). La UI exige confirmación explícita antes de llamar aquí.
export async function eliminarModulo(id: string): Promise<Resultado> {
  const modulo = await prisma.modulo.findUnique({ where: { id } });
  if (!modulo) return { ok: false, error: "El módulo no existe" };

  const total = await prisma.modulo.count();
  if (total <= 1)
    return { ok: false, error: "No puedes eliminar el único módulo de la plataforma" };

  // Borra primero los archivos físicos de los adjuntos
  const adjuntos = await prisma.adjunto.findMany({
    where: { cliente: { etapa: { moduloId: id } } },
    select: { url: true },
  });
  for (const a of adjuntos) await eliminarArchivo(a.url);

  await prisma.$transaction([
    prisma.cliente.deleteMany({ where: { etapa: { moduloId: id } } }),
    prisma.modulo.delete({ where: { id } }), // cascada: etapas y campos
  ]);
  revalidatePath("/");
  return { ok: true };
}
