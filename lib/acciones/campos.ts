"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Resultado } from "@/lib/acciones/etapas";
import { TIPOS_CAMPO, type TipoCampo } from "@/lib/tipos";

const esquemaNombre = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(60, "El nombre no puede superar 60 caracteres");

function validarTipo(tipo: string): tipo is TipoCampo {
  return (TIPOS_CAMPO as readonly string[]).includes(tipo);
}

// Normaliza opciones: quita vacíos y duplicados; exige al menos una
function normalizarOpciones(opciones: string[]): string[] {
  return [...new Set(opciones.map((o) => o.trim()).filter((o) => o !== ""))];
}

export async function crearCampo(datos: {
  moduloId: string;
  nombre: string;
  tipo: string;
  opciones?: string[];
}): Promise<Resultado> {
  const n = esquemaNombre.safeParse(datos.nombre);
  if (!n.success) return { ok: false, error: n.error.issues[0].message };
  if (!validarTipo(datos.tipo)) return { ok: false, error: "Tipo de campo inválido" };

  const modulo = await prisma.modulo.findUnique({
    where: { id: datos.moduloId },
  });
  if (!modulo) return { ok: false, error: "El módulo no existe" };

  let opciones: string | null = null;
  if (datos.tipo === "SELECCION") {
    const limpias = normalizarOpciones(datos.opciones ?? []);
    if (limpias.length === 0)
      return { ok: false, error: "Agrega al menos una opción para el campo de selección" };
    opciones = JSON.stringify(limpias);
  }

  const max = await prisma.definicionCampo.aggregate({
    where: { moduloId: datos.moduloId },
    _max: { orden: true },
  });
  await prisma.definicionCampo.create({
    data: {
      nombre: n.data,
      tipo: datos.tipo,
      opciones,
      orden: (max._max.orden ?? -1) + 1,
      moduloId: datos.moduloId,
    },
  });
  revalidatePath("/");
  return { ok: true };
}

// Nota: cambiar el tipo no convierte los valores ya capturados (se guardan
// como texto); solo cambia cómo se captura de aquí en adelante.
export async function actualizarCampo(
  id: string,
  datos: { nombre: string; tipo: string; opciones?: string[] }
): Promise<Resultado> {
  const n = esquemaNombre.safeParse(datos.nombre);
  if (!n.success) return { ok: false, error: n.error.issues[0].message };
  if (!validarTipo(datos.tipo)) return { ok: false, error: "Tipo de campo inválido" };

  const existe = await prisma.definicionCampo.findUnique({ where: { id } });
  if (!existe) return { ok: false, error: "El campo no existe" };

  let opciones: string | null = null;
  if (datos.tipo === "SELECCION") {
    const limpias = normalizarOpciones(datos.opciones ?? []);
    if (limpias.length === 0)
      return { ok: false, error: "Agrega al menos una opción para el campo de selección" };
    opciones = JSON.stringify(limpias);
  }

  await prisma.definicionCampo.update({
    where: { id },
    data: { nombre: n.data, tipo: datos.tipo, opciones },
  });
  revalidatePath("/");
  return { ok: true };
}

export async function moverCampo(
  id: string,
  direccion: -1 | 1
): Promise<Resultado> {
  const actual = await prisma.definicionCampo.findUnique({ where: { id } });
  if (!actual) return { ok: false, error: "El campo no existe" };
  const campos = await prisma.definicionCampo.findMany({
    where: { moduloId: actual.moduloId },
    orderBy: { orden: "asc" },
  });
  const indice = campos.findIndex((c) => c.id === id);
  if (indice === -1) return { ok: false, error: "El campo no existe" };
  const vecino = campos[indice + direccion];
  if (!vecino) return { ok: true };

  await prisma.$transaction([
    prisma.definicionCampo.update({
      where: { id },
      data: { orden: vecino.orden },
    }),
    prisma.definicionCampo.update({
      where: { id: vecino.id },
      data: { orden: campos[indice].orden },
    }),
  ]);
  revalidatePath("/");
  return { ok: true };
}

// Elimina el campo y (en cascada) los valores capturados en los clientes.
export async function eliminarCampo(id: string): Promise<Resultado> {
  const existe = await prisma.definicionCampo.findUnique({
    where: { id },
    include: { _count: { select: { valores: true } } },
  });
  if (!existe) return { ok: false, error: "El campo no existe" };

  await prisma.definicionCampo.delete({ where: { id } });
  revalidatePath("/");
  return { ok: true };
}

// Cuántos clientes tienen valor capturado en este campo (para avisar antes de borrar)
export async function contarValoresCampo(id: string): Promise<number> {
  return prisma.valorCampo.count({ where: { campoId: id } });
}
