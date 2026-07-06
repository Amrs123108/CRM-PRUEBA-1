"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Resultado } from "@/lib/acciones/etapas";

const esquemaMeta = z.object({
  moduloId: z.string().min(1),
  mes: z.string().regex(/^\d{4}-\d{2}$/, "Mes inválido"),
  metaClientes: z.number().int("Debe ser un número entero").min(0, "Mínimo 0"),
  metaMonto: z.number().min(0, "Mínimo 0"),
});

export async function guardarMeta(datos: {
  moduloId: string;
  mes: string;
  metaClientes: number;
  metaMonto: number;
}): Promise<Resultado> {
  const d = esquemaMeta.safeParse(datos);
  if (!d.success) return { ok: false, error: d.error.issues[0].message };

  const modulo = await prisma.modulo.findUnique({ where: { id: d.data.moduloId } });
  if (!modulo) return { ok: false, error: "El módulo no existe" };

  await prisma.meta.upsert({
    where: { moduloId_mes: { moduloId: d.data.moduloId, mes: d.data.mes } },
    update: { metaClientes: d.data.metaClientes, metaMonto: d.data.metaMonto },
    create: d.data,
  });
  revalidatePath("/dashboard");
  return { ok: true };
}
