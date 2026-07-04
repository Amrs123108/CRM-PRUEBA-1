"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type Resultado = { ok: true } | { ok: false; error: string };

const esquemaNombre = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(60, "El nombre no puede superar 60 caracteres");

const esquemaColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color inválido");

export async function crearEtapa(
  nombre: string,
  color: string
): Promise<Resultado> {
  const n = esquemaNombre.safeParse(nombre);
  if (!n.success) return { ok: false, error: n.error.issues[0].message };
  const c = esquemaColor.safeParse(color);
  if (!c.success) return { ok: false, error: c.error.issues[0].message };

  const max = await prisma.etapa.aggregate({ _max: { orden: true } });
  await prisma.etapa.create({
    data: { nombre: n.data, color: c.data, orden: (max._max.orden ?? -1) + 1 },
  });
  revalidatePath("/");
  return { ok: true };
}

export async function actualizarEtapa(
  id: string,
  datos: { nombre?: string; color?: string }
): Promise<Resultado> {
  const cambios: { nombre?: string; color?: string } = {};
  if (datos.nombre !== undefined) {
    const n = esquemaNombre.safeParse(datos.nombre);
    if (!n.success) return { ok: false, error: n.error.issues[0].message };
    cambios.nombre = n.data;
  }
  if (datos.color !== undefined) {
    const c = esquemaColor.safeParse(datos.color);
    if (!c.success) return { ok: false, error: c.error.issues[0].message };
    cambios.color = c.data;
  }
  if (Object.keys(cambios).length === 0)
    return { ok: false, error: "No hay cambios que guardar" };

  await prisma.etapa.update({ where: { id }, data: cambios });
  revalidatePath("/");
  return { ok: true };
}

// Intercambia la posición de la etapa con su vecina (dirección -1 o 1)
export async function moverEtapa(
  id: string,
  direccion: -1 | 1
): Promise<Resultado> {
  const etapas = await prisma.etapa.findMany({ orderBy: { orden: "asc" } });
  const indice = etapas.findIndex((e) => e.id === id);
  if (indice === -1) return { ok: false, error: "La etapa no existe" };
  const vecina = etapas[indice + direccion];
  if (!vecina) return { ok: true }; // ya está en el extremo

  await prisma.$transaction([
    prisma.etapa.update({
      where: { id },
      data: { orden: vecina.orden },
    }),
    prisma.etapa.update({
      where: { id: vecina.id },
      data: { orden: etapas[indice].orden },
    }),
  ]);
  revalidatePath("/");
  return { ok: true };
}

// Si la etapa tiene clientes, exige una etapa destino a dónde moverlos.
export async function eliminarEtapa(
  id: string,
  etapaDestinoId?: string
): Promise<Resultado> {
  const cantidad = await prisma.cliente.count({ where: { etapaId: id } });
  if (cantidad > 0) {
    if (!etapaDestinoId || etapaDestinoId === id) {
      return {
        ok: false,
        error: `La etapa tiene ${cantidad} cliente(s). Selecciona a qué etapa moverlos antes de eliminarla.`,
      };
    }
    const destino = await prisma.etapa.findUnique({
      where: { id: etapaDestinoId },
    });
    if (!destino) return { ok: false, error: "La etapa destino no existe" };
    await prisma.cliente.updateMany({
      where: { etapaId: id },
      data: { etapaId: etapaDestinoId },
    });
  }
  await prisma.etapa.delete({ where: { id } });
  revalidatePath("/");
  return { ok: true };
}
