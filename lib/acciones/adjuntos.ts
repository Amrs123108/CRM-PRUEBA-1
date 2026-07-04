"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Resultado } from "@/lib/acciones/etapas";
import {
  guardarArchivo,
  eliminarArchivo,
  TIPOS_PERMITIDOS,
  TAMANO_MAXIMO,
} from "@/lib/almacenamiento";

export async function subirAdjunto(formData: FormData): Promise<Resultado> {
  const clienteId = formData.get("clienteId");
  const archivo = formData.get("archivo");

  if (typeof clienteId !== "string" || !(archivo instanceof File)) {
    return { ok: false, error: "Datos de carga inválidos" };
  }
  if (archivo.size === 0) return { ok: false, error: "El archivo está vacío" };
  if (archivo.size > TAMANO_MAXIMO)
    return { ok: false, error: "El archivo supera el límite de 8 MB" };
  if (!TIPOS_PERMITIDOS[archivo.type]) {
    return {
      ok: false,
      error: "Solo se permiten imágenes (JPG, PNG, WebP, GIF) y PDF",
    };
  }

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) return { ok: false, error: "El cliente no existe" };

  try {
    const { url } = await guardarArchivo(clienteId, archivo);
    await prisma.adjunto.create({
      data: {
        clienteId,
        nombre: archivo.name.slice(0, 150),
        tipoMime: archivo.type,
        url,
        tamano: archivo.size,
      },
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo guardar el archivo",
    };
  }

  revalidatePath("/");
  return { ok: true };
}

export async function eliminarAdjunto(id: string): Promise<Resultado> {
  const adjunto = await prisma.adjunto.findUnique({ where: { id } });
  if (!adjunto) return { ok: false, error: "El adjunto no existe" };

  await prisma.adjunto.delete({ where: { id } });
  await eliminarArchivo(adjunto.url);

  revalidatePath("/");
  return { ok: true };
}
