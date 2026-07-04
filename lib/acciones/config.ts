"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Resultado } from "@/lib/acciones/etapas";

const esquemaDias = z
  .number()
  .int("Debe ser un número entero")
  .min(0, "Mínimo 0 días")
  .max(365, "Máximo 365 días");

export async function actualizarDiasAviso(dias: number): Promise<Resultado> {
  const d = esquemaDias.safeParse(dias);
  if (!d.success) return { ok: false, error: d.error.issues[0].message };

  await prisma.configuracion.upsert({
    where: { id: 1 },
    update: { diasAviso: d.data },
    create: { id: 1, diasAviso: d.data },
  });
  revalidatePath("/");
  return { ok: true };
}
